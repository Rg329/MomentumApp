import { useAppStore } from '../store/useAppStore';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { isSupabaseSignedIn } from '../auth/sessionUtils';
import { derivePersonalization } from '../personalization/engine';
import {
  buildDeadlinePriorities,
  generateScheduleFromTasks,
  parseTimeToMinutes,
  selectTasksForSchedule,
} from './generateSchedule';
import type { GenerateScheduleResult } from './generateSchedule';
import { notifyScheduleReadyIfEnabled } from '../notifications/safeEntry';
import { buildCoachingContext } from '../coaching/contextBuilder';
import { applyBehaviorToScheduleHints } from './behaviorScheduleHints';
import { applyProScheduleEnhancements } from './proScheduleOptimization';
import { primarySignal } from '../coaching/signals';
import type { CoachingContext } from '../coaching/types';

export type ScheduleGenerationSource = 'claude' | 'local';

export type GenerateScheduleResultWithSource = GenerateScheduleResult & {
  source: ScheduleGenerationSource;
  sourceDetail?: string;
};

function persistSchedule(
  blocks: GenerateScheduleResult['blocks'],
  meta?: {
    source?: ScheduleGenerationSource;
    sourceDetail?: string;
    proSummary?: string | null;
    proRules?: string[];
  },
) {
  const { tasks } = useAppStore.getState();
  useAppStore.setState({
    scheduleBlocks:       blocks,
    scheduleDate:         new Date().toISOString().split('T')[0],
    lastScheduledTaskIds: tasks.map((t) => t.id),
    lastScheduleSource:     meta?.source ?? null,
    lastScheduleSourceDetail: meta?.sourceDetail ?? null,
    lastProOptimizationSummary: meta?.proSummary ?? null,
    lastProOptimizationRules: meta?.proRules ?? [],
  });
}

function buildBehavioralPayload(ctx: CoachingContext | null) {
  if (!ctx?.hasBehavioralData) return undefined;

  return {
    primarySignal: primarySignal(ctx),
    coachingDirectives: ctx.coachingDirectives,
    patterns: ctx.insights.procrastinationPatterns.slice(0, 4).map((p) => ({
      id: p.id,
      label: p.label,
      severity: p.severity,
      description: p.description,
    })),
    metrics: {
      completionRate: ctx.metrics.completionRate,
      tasksCompleted: ctx.metrics.tasksCompleted,
      tasksSkipped: ctx.metrics.tasksSkipped,
      tasksRescheduled: ctx.metrics.tasksRescheduled,
      currentStreak: ctx.metrics.currentStreak,
    },
    bestFocusPeriod: ctx.insights.bestFocusPeriod,
  };
}

/**
 * Build today's timetable using Claude AI, with the local algorithm as a silent fallback.
 * Applies behavioral schedule adjustments when enough event data exists.
 */
export async function buildAndSaveUserSchedule(): Promise<GenerateScheduleResultWithSource> {
  const {
    tasks,
    wakeTime,
    sleepTime,
    onboardingData,
    constraints,
    deadlines,
    isPremium,
    preferences,
  } = useAppStore.getState();

  if (!isSupabaseConfigured) {
    console.warn('[Schedule] LOCAL fallback — Supabase env vars not configured in this build.');
  }

  const signedIn = await isSupabaseSignedIn();
  if (!signedIn) {
    console.warn('[Schedule] LOCAL fallback — not signed in (generate-schedule requires auth).');
  }

  const personalization = derivePersonalization(
    onboardingData.procrastinationType,
    onboardingData.peakTime,
    onboardingData.coaching,
    wakeTime,
    sleepTime,
  );

  let coachingCtx: CoachingContext | null = null;
  let scheduleHints = personalization.scheduleHints;
  let proSummary: string | null = null;
  let proRules: string[] = [];
  const proOptimizationEnabled = isPremium && preferences.advancedOptimizationEnabled;

  try {
    coachingCtx = await buildCoachingContext();
    if (proOptimizationEnabled) {
      const behavior = coachingCtx.hasBehavioralData
        ? applyBehaviorToScheduleHints(scheduleHints, coachingCtx)
        : null;
      if (behavior) {
        scheduleHints = behavior.hints;
      }
      const pro = applyProScheduleEnhancements(
        scheduleHints,
        behavior,
        coachingCtx,
        onboardingData.procrastinationType,
      );
      scheduleHints = pro.hints;
      proSummary = pro.summary;
      proRules = pro.rules;
      console.info('[Schedule] PRO optimization applied:', proSummary);
    }
  } catch (e) {
    console.warn('[Schedule] Could not apply behavioral hints:', e);
  }

  const behavioralContext = buildBehavioralPayload(coachingCtx);

  // ── Try AI generation ────────────────────────────────────────────────────────
  let edgeFailureDetail: string | undefined;
  try {
    const { data, error } = await supabase.functions.invoke('generate-schedule', {
      body: {
        tasks,
        procrastinationType: onboardingData.procrastinationType,
        peakTime:            onboardingData.peakTime,
        wakeTime,
        sleepTime,
        constraints,
        deadlines,
        behavioralContext,
        proOptimization: proOptimizationEnabled,
        proOptimizationRules: proRules,
        scheduleHints: {
          maxVisibleTasks: scheduleHints.maxVisibleTasks,
          chunkThresholdMinutes: scheduleHints.chunkThresholdMinutes,
          breakLargeTasks: scheduleHints.breakLargeTasks,
          energyPattern: scheduleHints.energyPattern,
          scheduleRationale: scheduleHints.scheduleRationale,
          peakFocusStartMinutes: scheduleHints.peakFocusStartMinutes,
          peakFocusEndMinutes: scheduleHints.peakFocusEndMinutes,
          bufferMultiplier: scheduleHints.bufferMultiplier,
        },
      },
    });

    if (!error && Array.isArray(data?.blocks) && data.blocks.length > 0) {
      console.info(
        `[Schedule] CLAUDE — ${data.blocks.length} block(s) from generate-schedule (Haiku via Supabase).`,
      );
      persistSchedule(data.blocks, {
        source: 'claude',
        proSummary,
        proRules,
      });
      notifyScheduleReadyIfEnabled(data.blocks.length);
      return { blocks: data.blocks, droppedTasks: [], source: 'claude' };
    }

    edgeFailureDetail = error
      ? `edge function error: ${typeof error === 'object' && error && 'message' in error ? String((error as { message?: string }).message) : String(error)}`
      : 'edge function returned no blocks';
    console.warn(`[Schedule] LOCAL fallback — ${edgeFailureDetail}`);
  } catch (e) {
    edgeFailureDetail = `invoke failed: ${String(e)}`;
    console.warn('[Schedule] LOCAL fallback — invoke failed:', e);
  }

  // ── Fallback: local deterministic algorithm ──────────────────────────────────
  const sourceDetail = !isSupabaseConfigured
    ? 'supabase_not_configured'
    : !signedIn
      ? 'not_signed_in'
      : edgeFailureDetail ?? 'edge_function_failed';
  const local = buildLocalSchedule(scheduleHints, {
    source: 'local',
    sourceDetail,
    proSummary,
    proRules,
  });
  return { ...local, source: 'local', sourceDetail };
}

function buildLocalSchedule(
  scheduleHints: ReturnType<typeof derivePersonalization>['scheduleHints'],
  meta: {
    source: ScheduleGenerationSource;
    sourceDetail?: string;
    proSummary?: string | null;
    proRules?: string[];
  },
): GenerateScheduleResult {
  const { tasks, wakeTime, sleepTime, constraints, deadlines, onboardingData } = useAppStore.getState();

  const blockedSlots = constraints
    .map((c) => ({
      startMinutes: parseTimeToMinutes(c.start),
      endMinutes:   parseTimeToMinutes(c.end),
      title:        c.title,
    }))
    .filter(
      (s): s is { startMinutes: number; endMinutes: number; title: string } =>
        s.startMinutes !== null && s.endMinutes !== null && s.endMinutes > s.startMinutes,
    );

  const cappedTasks = selectTasksForSchedule(
    tasks,
    scheduleHints.maxVisibleTasks,
    deadlines,
  );
  const deadlinePriorities = buildDeadlinePriorities(deadlines);
  const leadWithQuickWin =
    onboardingData.procrastinationType === 'waiting_motivation' ||
    onboardingData.procrastinationType === 'dont_know_start' ||
    onboardingData.procrastinationType === 'overwhelmed_tasks' ||
    onboardingData.procrastinationType === 'easily_distracted';

  const result = generateScheduleFromTasks({
    tasks: cappedTasks,
    wakeTimeMinutes:  wakeTime,
    sleepTimeMinutes: sleepTime,
    scheduleHints,
    blockedSlots,
    constraints,
    deadlines,
    deadlinePriorities,
    leadWithQuickWin,
  });

  persistSchedule(result.blocks, meta);
  notifyScheduleReadyIfEnabled(result.blocks.length);
  console.info(`[Schedule] LOCAL — ${result.blocks.length} block(s) from on-device algorithm (no Claude cost).`);
  return result;
}
