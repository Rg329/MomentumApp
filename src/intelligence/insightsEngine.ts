/**
 * Pure insights engine — derives behavioral patterns from task events.
 */
import type {
  CompletionTrendPoint,
  ProcrastinationPattern,
  TaskEventRow,
  UserInsights,
} from './types';
import type { BehaviorProfile } from '../personalization/behaviorProfile';

const PERIOD_LABELS = [
  { start: 5, end: 12, label: 'Morning (5 AM – 12 PM)' },
  { start: 12, end: 17, label: 'Afternoon (12 PM – 5 PM)' },
  { start: 17, end: 22, label: 'Evening (5 PM – 10 PM)' },
  { start: 22, end: 29, label: 'Night (10 PM – 5 AM)' },
] as const;

function hourBucket(hour: number): string {
  for (const p of PERIOD_LABELS) {
    const h = hour < 5 ? hour + 24 : hour;
    if (h >= p.start && h < p.end) return p.label;
  }
  return 'Unknown';
}

function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

function avgMinutesBetweenCreatedAndStarted(events: TaskEventRow[]): number | null {
  const byTask = new Map<string, { created?: string; started?: string }>();
  for (const e of events) {
    const row = byTask.get(e.task_id) ?? {};
    if (e.event_type === 'task_created') row.created = e.occurred_at;
    if (e.event_type === 'task_started') row.started = e.occurred_at;
    byTask.set(e.task_id, row);
  }

  const gaps: number[] = [];
  for (const { created, started } of byTask.values()) {
    if (!created || !started) continue;
    gaps.push((Date.parse(started) - Date.parse(created)) / 60_000);
  }

  if (!gaps.length) return null;
  return gaps.reduce((a, b) => a + b, 0) / gaps.length;
}

function buildCompletionTrends(events: TaskEventRow[], days = 7): CompletionTrendPoint[] {
  const today = new Date();
  const points: CompletionTrendPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);

    const dayEvents = events.filter((e) => isoDate(e.occurred_at) === date);
    const completed = dayEvents.filter((e) => e.event_type === 'task_completed').length;
    const skipped = dayEvents.filter((e) => e.event_type === 'task_skipped').length;
    const started = dayEvents.filter((e) => e.event_type === 'task_started').length;
    const denom = completed + skipped;

    points.push({
      date,
      completed,
      skipped,
      started,
      completionRate: denom > 0 ? completed / denom : 0,
    });
  }

  return points;
}

function detectBestFocusPeriod(events: TaskEventRow[], behavior: BehaviorProfile): string {
  const completions = events.filter((e) => e.event_type === 'task_completed');
  if (!completions.length) {
    if (behavior.peakTime) return `${behavior.peakTime} (from onboarding)`;
    return 'Not enough data yet — complete a few focus sessions first.';
  }

  const counts = new Map<string, number>();
  for (const e of completions) {
    const hour = new Date(e.occurred_at).getHours();
    const bucket = hourBucket(hour);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }

  let best = '';
  let max = 0;
  for (const [label, count] of counts) {
    if (count > max) {
      max = count;
      best = label;
    }
  }

  return `${best} (${max} completions logged)`;
}

function detectSkipReasonPatterns(events: TaskEventRow[]): ProcrastinationPattern[] {
  const patterns: ProcrastinationPattern[] = [];
  const skipEvents = events.filter((e) => e.event_type === 'task_skipped');
  if (skipEvents.length < 2) return patterns;

  const reasonCounts = new Map<string, number>();
  for (const e of skipEvents) {
    const reason = (e.metadata?.skip_reason as string | undefined) ?? 'other';
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }

  let topReason = 'other';
  let topCount = 0;
  for (const [reason, count] of reasonCounts) {
    if (count > topCount) {
      topCount = count;
      topReason = reason;
    }
  }

  if (topCount >= 2 && topReason !== 'other') {
    const labels: Record<string, string> = {
      distracted: 'Distraction-driven skips',
      no_time: 'Time pressure skips',
      low_energy: 'Low-energy skips',
      priority_changed: 'Priority-shift skips',
      underestimated: 'Underestimated duration',
    };
    patterns.push({
      id: 'high_skip_rate',
      label: labels[topReason] ?? 'Recurring skip pattern',
      severity: topCount >= skipEvents.length * 0.5 ? 'high' : 'medium',
      description: `Your most common skip reason lately is "${topReason.replace(/_/g, ' ')}".`,
      evidence: `${topCount} of ${skipEvents.length} skips share this reason.`,
    });
  }

  const skipByDay = new Map<string, number>();
  for (const e of skipEvents) {
    const day = isoDate(e.occurred_at);
    skipByDay.set(day, (skipByDay.get(day) ?? 0) + 1);
  }
  const heavySkipDays = [...skipByDay.values()].filter((c) => c >= 2).length;
  if (heavySkipDays >= 2) {
    patterns.push({
      id: 'failure_avoidance',
      label: 'Skip-heavy days',
      severity: 'medium',
      description: 'Some days you skip multiple tasks instead of finishing one.',
      evidence: `${heavySkipDays} days with 2+ skips in the last week.`,
    });
  }

  return patterns;
}

function detectProcrastinationPatterns(
  events: TaskEventRow[],
  behavior: BehaviorProfile,
): ProcrastinationPattern[] {
  const patterns: ProcrastinationPattern[] = [];
  const skipped = events.filter((e) => e.event_type === 'task_skipped').length;
  const rescheduled = events.filter((e) => e.event_type === 'task_rescheduled').length;
  const created = events.filter((e) => e.event_type === 'task_created').length;
  const completed = events.filter((e) => e.event_type === 'task_completed').length;
  const avgLag = avgMinutesBetweenCreatedAndStarted(events);

  patterns.push(...detectSkipReasonPatterns(events));

  if (skipped > 0 && skipped >= completed * 0.3) {
    patterns.push({
      id: 'high_skip_rate',
      label: 'Frequent task avoidance',
      severity: skipped >= completed ? 'high' : 'medium',
      description: 'You skip tasks more often than you complete them.',
      evidence: `${skipped} skipped vs ${completed} completed in the last 30 days.`,
    });
  }

  if (rescheduled >= 3) {
    patterns.push({
      id: 'plan_instability',
      label: 'Schedule reshuffling',
      severity: rescheduled >= 6 ? 'high' : 'medium',
      description: 'Tasks are often moved after being planned.',
      evidence: `${rescheduled} reschedule events logged.`,
    });
  }

  if (avgLag != null && avgLag > 180) {
    patterns.push({
      id: 'start_delay',
      label: 'Long start delays',
      severity: avgLag > 360 ? 'high' : 'medium',
      description: 'There is a long gap between creating tasks and starting them.',
      evidence: `Average delay: ${Math.round(avgLag)} minutes.`,
    });
  }

  if (created > 0 && completed / created < 0.4) {
    patterns.push({
      id: 'low_follow_through',
      label: 'Low follow-through',
      severity: 'medium',
      description: 'Many planned tasks never reach completion.',
      evidence: `${completed} of ${created} created tasks completed.`,
    });
  }

  if (skipped > 0 && completed > 0 && skipped >= completed * 0.25) {
    patterns.push({
      id: 'failure_avoidance',
      label: 'Avoidance under pressure',
      severity: 'medium',
      description: 'You skip more when tasks feel high-stakes.',
      evidence: `${skipped} skipped vs ${completed} completed in the last 30 days.`,
    });
  }

  if (!patterns.length) {
    patterns.push({
      id: 'healthy_rhythm',
      label: 'Stable execution rhythm',
      severity: 'low',
      description: 'No major procrastination signals detected in recent activity.',
      evidence: 'Keep logging focus sessions to refine insights.',
    });
  }

  const byId = new Map<string, ProcrastinationPattern>();
  for (const p of patterns) {
    const existing = byId.get(p.id);
    if (!existing || severityRank(p.severity) > severityRank(existing.severity)) {
      byId.set(p.id, p);
    }
  }

  return [...byId.values()];
}

function severityRank(s: ProcrastinationPattern['severity']): number {
  if (s === 'high') return 3;
  if (s === 'medium') return 2;
  return 1;
}

/** Generate full insights package from raw events + behavior profile. */
export function generateInsights(
  events: TaskEventRow[],
  behaviorProfile: BehaviorProfile,
): UserInsights {
  return {
    bestFocusPeriod: detectBestFocusPeriod(events, behaviorProfile),
    completionTrends: buildCompletionTrends(events),
    procrastinationPatterns: detectProcrastinationPatterns(events, behaviorProfile),
    generatedAt: new Date().toISOString(),
  };
}
