import { useAppStore } from '../store/useAppStore';
import { derivePersonalization } from '../personalization/engine';
import { generateScheduleFromTasks } from './generateSchedule';
import type { ScheduleBlock } from '../data/mockData';

/**
 * Build today's timetable from the current user's brain-dump tasks and persist to the store.
 */
export function buildAndSaveUserSchedule(): ScheduleBlock[] {
  const { tasks, wakeTime, sleepTime, onboardingData } = useAppStore.getState();

  const personalization = derivePersonalization(
    onboardingData.procrastinationType,
    onboardingData.peakTime,
    onboardingData.coaching,
    wakeTime,
    sleepTime,
  );

  const scheduleBlocks = generateScheduleFromTasks({
    tasks,
    wakeTimeMinutes: wakeTime,
    sleepTimeMinutes: sleepTime,
    scheduleHints: personalization.scheduleHints,
  });

  useAppStore.setState({ scheduleBlocks });
  return scheduleBlocks;
}
