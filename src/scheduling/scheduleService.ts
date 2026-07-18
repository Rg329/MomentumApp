import { useAppStore } from '../store/useAppStore';
import { supabase } from '../supabase/client';
import { derivePersonalization } from '../personalization/engine';
import { generateScheduleFromTasks, parseTimeToMinutes } from './generateSchedule';
import type { GenerateScheduleResult } from './generateSchedule';
import { notifyScheduleReadyIfEnabled } from '../notifications/safeEntry';
import { buildCoachingContext } from '../coaching/contextBuilder';
import { applyBehaviorToScheduleHints } from './behaviorScheduleHints';
import { primarySignal } from '../coaching/signals';
import type { CoachingContext } from '../coaching/types';

function persistSchedule(blocks: GenerateScheduleResult['blocks']) {
  const { tasks } = useAppStore.getState();
  useAppStore.setState({
    scheduleBlocks:       blocks,
    scheduleDate:         new Date().toISOString().split('T')[0],
    lastScheduledTaskIds: tasks.map((t) => t.id),
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
export async function buildAndSaveUserSchedule(): Promise<GenerateScheduleResult> {
  const { tasks, wakeTime, sleepTime, onboardingData, constraints, deadlines } = useAppStore.getState();

  const personalization = derivePersonalization(
    onboardingData.procrastinationType,
    onboardingData.peakTime,
    onboardingData.coaching,
    wakeTime,
    sleepTime,
  );

  let coachingCtx: CoachingContext | null = null;
  let scheduleHints = personalization.scheduleHints;

  try {
    coachingCtx = await buildCoachingContext();
    if (coachingCtx.hasBehavioralData) {
      scheduleHints = applyBehaviorToScheduleHints(scheduleHints, coachingCtx).hints;
    }
  } catch (e) {
    console.warn('[Schedule] Could not apply behavioral hints:', e);
  }

  const behavioralContext = buildBehavioralPayload(coachingCtx);

  // ── Try AI generation ────────────────────────────────────────────────────────
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
        scheduleHints: {
          maxVisibleTasks: scheduleHints.maxVisibleTasks,
          chunkThresholdMinutes: scheduleHints.chunkThresholdMinutes,
          breakLargeTasks: scheduleHints.breakLargeTasks,
          energyPattern: scheduleHints.energyPattern,
          scheduleRationale: scheduleHints.scheduleRationale,
          peakFocusStartMinutes: scheduleHints.peakFocusStartMinutes,
          peakFocusEndMinutes: scheduleHints.peakFocusEndMinutes,
        },
      },
    });

    if (!error && Array.isArray(data?.blocks) && data.blocks.length > 0) {
      persistSchedule(data.blocks);
      notifyScheduleReadyIfEnabled(data.blocks.length);
      return { blocks: data.blocks, droppedTasks: [] };
    }
  } catch {
    // Network error or edge function down — fall through to local algorithm
  }

  // ── Fallback: local deterministic algorithm ──────────────────────────────────
  return buildLocalSchedule(scheduleHints);
}

function buildLocalSchedule(scheduleHints: ReturnType<typeof derivePersonalization>['scheduleHints']): GenerateScheduleResult {
  const { tasks, wakeTime, sleepTime, constraints } = useAppStore.getState();

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

  const cappedTasks = tasks.slice(0, scheduleHints.maxVisibleTasks);

  const result = generateScheduleFromTasks({
    tasks: cappedTasks,
    wakeTimeMinutes:  wakeTime,
    sleepTimeMinutes: sleepTime,
    scheduleHints,
    blockedSlots,
  });

  persistSchedule(result.blocks);
  notifyScheduleReadyIfEnabled(result.blocks.length);
  return result;
}
