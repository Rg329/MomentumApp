/**
 * Builds a daily timetable from the user's brain-dump tasks and personalization hints.
 */
import type { ScheduleBlock } from '../data/mockData';
import type { Task } from '../store/useAppStore';
import type { ScheduleHints } from '../personalization/types';
import { useAppStore } from '../store/useAppStore';

export type GenerateScheduleResult = {
  blocks: ScheduleBlock[];
  droppedTasks: Array<{ title: string; durationMinutes: number }>;
};

export type GenerateScheduleInput = {
  tasks: Task[];
  wakeTimeMinutes: number;
  sleepTimeMinutes: number;
  scheduleHints: ScheduleHints;
  blockedSlots?: Array<{ startMinutes: number; endMinutes: number; title: string }>;
};

const LUNCH_MINUTES = 30;

type BlockedSlot = { startMinutes: number; endMinutes: number; title?: string };

/** Parse "10:00 AM", "2:30 PM", or "14:30" → minutes from midnight. */
export function parseTimeToMinutes(timeStr: string): number | null {
  const trimmed = timeStr.trim();
  if (!trimmed || trimmed === '—' || trimmed === '-') return null;

  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let h = Number(match12[1]) % 12;
    const m = Number(match12[2]);
    if (match12[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + m;
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return Number(match24[1]) * 60 + Number(match24[2]);
  }

  return null;
}

function isBlocked(
  cursor: number,
  durationMinutes: number,
  blockedSlots: BlockedSlot[],
): boolean {
  const end = cursor + durationMinutes;
  return blockedSlots.some(
    (slot) => cursor < slot.endMinutes && end > slot.startMinutes,
  );
}

function advancePastBlock(
  cursor: number,
  durationMinutes: number,
  blockedSlots: BlockedSlot[],
): number {
  let c = cursor;
  let safety = 0;
  while (isBlocked(c, durationMinutes, blockedSlots) && safety < 48) {
    const conflict = blockedSlots.find(
      (s) => c < s.endMinutes && c + durationMinutes > s.startMinutes,
    );
    if (conflict) c = conflict.endMinutes;
    safety += 1;
  }
  return c;
}

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
export function generateScheduleFromTasks(input: GenerateScheduleInput): GenerateScheduleResult {
  const { tasks, wakeTimeMinutes, sleepTimeMinutes, scheduleHints, blockedSlots = [] } = input;
  if (!tasks.length) return { blocks: [], droppedTasks: [] };

  const units = expandTasks(tasks, scheduleHints).sort(
    (a, b) =>
      orderingScore(
        b,
        tasks.findIndex((t) => b.taskId === t.id || b.taskId.startsWith(t.id + '-p')),
        scheduleHints,
      ) -
      orderingScore(
        a,
        tasks.findIndex((t) => a.taskId === t.id || a.taskId.startsWith(t.id + '-p')),
        scheduleHints,
      ),
  );

  const blocks: ScheduleBlock[] = [];
  const droppedTasks: GenerateScheduleResult['droppedTasks'] = [];
  let cursor = scheduleHints.peakFocusStartMinutes ?? wakeTimeMinutes + 45;
  const dayEnd = Math.min(
    sleepTimeMinutes - 45,
    wakeTimeMinutes + scheduleHints.productiveMinutesAvailable + 90,
  );
  let lunchInserted = false;
  const lunchTarget = wakeTimeMinutes + Math.floor((sleepTimeMinutes - wakeTimeMinutes) / 2);

  units.forEach((unit, index) => {
    if (!lunchInserted && cursor >= lunchTarget - 30 && cursor >= wakeTimeMinutes + 180) {
      cursor = advancePastBlock(cursor, LUNCH_MINUTES, blockedSlots);
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

    cursor = advancePastBlock(cursor, unit.durationMinutes, blockedSlots);

    if (cursor + unit.durationMinutes > dayEnd) {
      droppedTasks.push({ title: unit.title, durationMinutes: unit.durationMinutes });
      return;
    }

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

    if (index === 0 && scheduleHints.scheduleRationale?.trim()) {
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

  return {
    blocks: blocks.sort((a, b) => {
      const toMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      return toMins(a.time) - toMins(b.time);
    }),
    droppedTasks,
  };
}
