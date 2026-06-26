/**
 * Structured behavior profile derived from onboarding answers.
 * Consumed by the personalization engine and future scheduling AI.
 */
import type { CoachStyle, PeakTime, ProcrastinationType } from './types';

export interface BehaviorProfileInput {
  procrastinationType: string | null;
  peakTime: string | null;
  wakeTimeMinutes: number;
  sleepTimeMinutes: number;
  coachStyle: string | null;
}

export interface BehaviorProfile {
  procrastinationType: ProcrastinationType | null;
  peakTime: PeakTime | null;
  coachStyle: CoachStyle | null;
  wakeTimeMinutes: number;
  sleepTimeMinutes: number;
  /** Awake window minus a 2h wind-down buffer, capped at 10h. */
  productiveMinutesAvailable: number;
  /** Start of modeled deep-focus window (minutes from midnight). */
  peakFocusStartMinutes: number;
  /** End of modeled deep-focus window (minutes from midnight). */
  peakFocusEndMinutes: number;
  energyArc: 'front-loaded' | 'balanced' | 'back-loaded';
  /** Primary scheduling intervention keyed to procrastination pattern. */
  schedulingPriority: string;
  /** Short labels for UI / AI context. */
  traits: string[];
  /** Risks the schedule should actively counter. */
  riskFactors: string[];
}

const PROCRASTINATION_LABELS: Record<ProcrastinationType, string> = {
  overwhelmed_tasks: 'task overwhelm',
  waiting_motivation: 'motivation dependency',
  dont_know_start: 'unclear starting points',
  easily_distracted: 'attention fragmentation',
  changing_plans: 'plan instability',
  underestimate_time: 'fear of failure',
};

const PEAK_RISK: Record<ProcrastinationType, string> = {
  overwhelmed_tasks: 'Large tasks may trigger avoidance before the day starts.',
  waiting_motivation: 'Low-arousal windows can stall execution without structure.',
  dont_know_start: 'Ambiguous tasks may never get a first block on the calendar.',
  easily_distracted: 'Unprotected focus windows are vulnerable to context switching.',
  changing_plans: 'Frequent replanning can erode follow-through.',
  underestimate_time: 'Perfection pressure can delay starting high-stakes work.',
};

function toProcrastinationType(raw: string | null): ProcrastinationType | null {
  const values: ProcrastinationType[] = [
    'overwhelmed_tasks',
    'waiting_motivation',
    'dont_know_start',
    'easily_distracted',
    'changing_plans',
    'underestimate_time',
  ];
  return values.includes(raw as ProcrastinationType) ? (raw as ProcrastinationType) : null;
}

function toPeakTime(raw: string | null): PeakTime | null {
  if (raw === 'morning' || raw === 'afternoon' || raw === 'evening') return raw;
  return null;
}

function toCoachStyle(raw: string | null): CoachStyle | null {
  if (raw === 'supportive' || raw === 'balanced' || raw === 'strict') return raw;
  return null;
}

function productiveMinutes(wakeTime: number, sleepTime: number): number {
  const awake = Math.max(0, sleepTime - wakeTime);
  return Math.min(Math.max(awake - 120, 0), 600);
}

function peakWindowForWake(wakeTime: number, sleepTimeMinutes: number, peakTime: PeakTime | null) {
  const duration = 120;
  if (peakTime === 'morning') {
    return { start: wakeTime + 60, end: wakeTime + 60 + duration };
  }
  if (peakTime === 'evening') {
    const end = Math.max(wakeTime + 180, sleepTimeMinutes - 180);
    return { start: Math.max(wakeTime + 120, end - duration), end };
  }
  // afternoon or default — ~2.75h after wake (matches CircadianRhythmPicker aura)
  return { start: wakeTime + 165, end: wakeTime + 165 + duration };
}

function energyArc(peakTime: PeakTime | null): BehaviorProfile['energyArc'] {
  if (peakTime === 'morning') return 'front-loaded';
  if (peakTime === 'evening') return 'back-loaded';
  return 'balanced';
}

function schedulingPriority(
  pt: ProcrastinationType | null,
  peakTime: PeakTime | null,
): string {
  if (!pt) return 'Build a realistic daily rhythm anchored to your wake and sleep window.';

  const peakPhrase =
    peakTime === 'morning' ? 'front-load demanding work after wake' :
    peakTime === 'evening' ? 'protect evening focus blocks' :
    'cluster deep work in your mid-day peak';

  const patternPhrase: Record<ProcrastinationType, string> = {
    overwhelmed_tasks: 'Cap visible tasks and chunk large items',
    waiting_motivation: 'Start with short, low-friction wins',
    dont_know_start: 'Assign explicit first steps to every task',
    easily_distracted: 'Guard peak hours for single-task focus',
    changing_plans: 'Lock a minimal viable schedule before optimizing',
    underestimate_time: 'Add buffers and define success as starting, not perfecting',
  };

  return `${patternPhrase[pt]}; ${peakPhrase}.`;
}

/**
 * Generate a behavior profile from the five onboarding dimensions.
 */
export function generateBehaviorProfile(input: BehaviorProfileInput): BehaviorProfile {
  const procrastinationType = toProcrastinationType(input.procrastinationType);
  const peakTime = toPeakTime(input.peakTime);
  const coachStyle = toCoachStyle(input.coachStyle);
  const wakeTimeMinutes = input.wakeTimeMinutes;
  const sleepTimeMinutes = input.sleepTimeMinutes;
  const productiveMinutesAvailable = productiveMinutes(wakeTimeMinutes, sleepTimeMinutes);
  const peak = peakWindowForWake(wakeTimeMinutes, sleepTimeMinutes, peakTime);

  const traits: string[] = [];
  if (procrastinationType) traits.push(PROCRASTINATION_LABELS[procrastinationType]);
  if (peakTime) traits.push(`${peakTime} peak focus`);
  if (coachStyle) traits.push(`${coachStyle} coaching`);
  traits.push(`${Math.round(productiveMinutesAvailable / 60)}h productive window`);

  const riskFactors: string[] = [];
  if (procrastinationType) riskFactors.push(PEAK_RISK[procrastinationType]);
  if (productiveMinutesAvailable < 300) {
    riskFactors.push('Short awake window — avoid over-stuffing the day.');
  }
  if (peakTime === 'evening' && wakeTimeMinutes >= 480) {
    riskFactors.push('Late wake + evening peak — morning hours are low-yield.');
  }

  return {
    procrastinationType,
    peakTime,
    coachStyle,
    wakeTimeMinutes,
    sleepTimeMinutes,
    productiveMinutesAvailable,
    peakFocusStartMinutes: peak.start,
    peakFocusEndMinutes: peak.end,
    energyArc: energyArc(peakTime),
    schedulingPriority: schedulingPriority(procrastinationType, peakTime),
    traits,
    riskFactors,
  };
}
