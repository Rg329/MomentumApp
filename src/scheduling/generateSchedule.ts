/**
 * Builds a daily timetable from the user's brain-dump tasks and personalization hints.
 */
import type { ScheduleBlock } from '../data/mockData';
import type { Task } from '../store/useAppStore';
import type { ScheduleHints } from '../personalization/types';
import { useAppStore } from '../store/useAppStore';

export type GenerateScheduleInput = {
  tasks: Task[];
  wakeTimeMinutes: number;
  sleepTimeMinutes: number;
  scheduleHints: ScheduleHints;
};

const LUNCH_MINUTES = 30;

function breakMinutes(): number {
  return useAppStore.getState().preferences.breakDurationMinutes;
}

function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function durationLabel(minutes: number): string {
  if (minutes >= 60) {
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  }
  return `${minutes}m`;
}

type WorkUnit = {
  taskId: string;
  title: string;
  durationMinutes: number;
};

function expandTasks(tasks: Task[], hints: ScheduleHints): WorkUnit[] {
  const units: WorkUnit[] = [];

  for (const task of tasks) {
    const duration = Math.max(
      15,
      Math.round(task.durationMinutes * hints.bufferMultiplier / 15) * 15,
    );

    if (hints.breakLargeTasks && duration > hints.chunkThresholdMinutes) {
      let remaining = duration;
      let part = 1;
      while (remaining > 0) {
        const chunk = Math.min(hints.chunkThresholdMinutes, remaining);
        units.push({
          taskId: part === 1 ? task.id : `${task.id}-p${part}`,
          title: part === 1 ? task.text : `${task.text} (Part ${part})`,
          durationMinutes: chunk,
        });
        remaining -= chunk;
        part += 1;
      }
    } else {
      units.push({
        taskId: task.id,
        title: task.text,
        durationMinutes: duration,
      });
    }
  }

  return units;
}

function orderingScore(unit: WorkUnit, index: number, hints: ScheduleHints): number {
  // Longer tasks earlier when front-loaded; reverse when back-loaded.
  const weight = hints.prioritizeLateHours ? -unit.durationMinutes : unit.durationMinutes;
  return weight - index * 0.01;
}

/**
 * Generate schedule blocks from the authenticated user's current local tasks.
 * Each deep-work block uses the task id so focus mode and event tracking stay aligned.
 */
export function generateScheduleFromTasks(input: GenerateScheduleInput): ScheduleBlock[] {
  const { tasks, wakeTimeMinutes, sleepTimeMinutes, scheduleHints } = input;
  if (!tasks.length) return [];

  const units = expandTasks(tasks, scheduleHints).sort(
    (a, b) => orderingScore(b, tasks.findIndex((t) => t.id === b.taskId), scheduleHints)
            - orderingScore(a, tasks.findIndex((t) => t.id === a.taskId), scheduleHints),
  );

  const blocks: ScheduleBlock[] = [];
  let cursor = scheduleHints.peakFocusStartMinutes ?? wakeTimeMinutes + 45;
  const dayEnd = Math.min(
    sleepTimeMinutes - 45,
    wakeTimeMinutes + scheduleHints.productiveMinutesAvailable + 90,
  );
  let lunchInserted = false;
  const lunchTarget = wakeTimeMinutes + Math.floor((sleepTimeMinutes - wakeTimeMinutes) / 2);

  units.forEach((unit, index) => {
    if (!lunchInserted && cursor >= lunchTarget - 30) {
      blocks.push({
        id: `break-lunch-${index}`,
        time: minutesToTime(cursor),
        type: 'break',
        label: 'Recovery',
        title: 'Lunch & Rest',
        description: `${LUNCH_MINUTES} min · Nutrition and mental recharge`,
        duration: `${LUNCH_MINUTES}m`,
      });
      cursor += LUNCH_MINUTES;
      lunchInserted = true;
    }

    if (cursor + unit.durationMinutes > dayEnd) return;

    blocks.push({
      id: unit.taskId,
      time: minutesToTime(cursor),
      type: 'deep_work',
      label: 'Deep Work Session',
      title: unit.title,
      description: `Focused block for: ${unit.title}`,
      duration: durationLabel(unit.durationMinutes),
      tag: 'Your Task',
      tagType: 'primary',
    });
    cursor += unit.durationMinutes;

    if (index === 0 && scheduleHints.scheduleRationale) {
      blocks.push({
        id: `insight-${unit.taskId}`,
        time: minutesToTime(cursor),
        type: 'insight',
        label: 'Momentum Insight',
        title: 'Insight',
        description: scheduleHints.scheduleRationale,
      });
      cursor += 10;
    }

    if (index < units.length - 1) {
      blocks.push({
        id: `break-${unit.taskId}`,
        time: minutesToTime(cursor),
        type: 'break',
        label: 'Cognitive Reset',
        title: 'Break',
        description: `${breakMinutes()} min break · Hydration & movement`,
        duration: `${breakMinutes()}m`,
      });
      cursor += breakMinutes();
    }
  });

  return blocks.sort((a, b) => {
    const toMins = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMins(a.time) - toMins(b.time);
  });
}
