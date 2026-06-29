import { useAppStore } from '../store/useAppStore';
import { supabase } from '../supabase/client';
import { derivePersonalization } from '../personalization/engine';
import { generateScheduleFromTasks, parseTimeToMinutes } from './generateSchedule';
import type { GenerateScheduleResult } from './generateSchedule';

/**
 * Build today's timetable using Claude AI, with the local algorithm as a silent fallback.
 * Persists the result to the store.
 */
export async function buildAndSaveUserSchedule(): Promise<GenerateScheduleResult> {
  const { tasks, wakeTime, sleepTime, onboardingData, constraints, deadlines } = useAppStore.getState();

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
      },
    });

    if (!error && Array.isArray(data?.blocks) && data.blocks.length > 0) {
      useAppStore.setState({
        scheduleBlocks: data.blocks,
        scheduleDate:   new Date().toISOString().split('T')[0],
      });
      return { blocks: data.blocks, droppedTasks: [] };
    }
  } catch {
    // Network error or edge function down — fall through to local algorithm
  }

  // ── Fallback: local deterministic algorithm ──────────────────────────────────
  return buildLocalSchedule();
}

function buildLocalSchedule(): GenerateScheduleResult {
  const { tasks, wakeTime, sleepTime, onboardingData, constraints } = useAppStore.getState();

  const personalization = derivePersonalization(
    onboardingData.procrastinationType,
    onboardingData.peakTime,
    onboardingData.coaching,
    wakeTime,
    sleepTime,
  );

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

  const result = generateScheduleFromTasks({
    tasks,
    wakeTimeMinutes:  wakeTime,
    sleepTimeMinutes: sleepTime,
    scheduleHints:    personalization.scheduleHints,
    blockedSlots,
  });

  useAppStore.setState({
    scheduleBlocks: result.blocks,
    scheduleDate:   new Date().toISOString().split('T')[0],
  });
  return result;
}
