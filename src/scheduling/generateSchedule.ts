/**
 * Builds a daily timetable from the user's brain-dump tasks and personalization hints.
 */
import type { ScheduleBlock } from '../types/schedule';
import type { Constraint, DeadlineTask, Task } from '../store/useAppStore';
import type { ScheduleHints } from '../personalization/types';
import { useAppStore } from '../store/useAppStore';

export type GenerateScheduleResult = {
  blocks: ScheduleBlock[];
  droppedTasks: Array<{ title: string; durationMinutes: number }>;
};

export type DeadlinePriority = {
  taskTitle: string;
  deadlineMinutes: number;
};

export type GenerateScheduleInput = {
  tasks: Task[];
  wakeTimeMinutes: number;
  sleepTimeMinutes: number;
  scheduleHints: ScheduleHints;
  blockedSlots?: Array<{ startMinutes: number; endMinutes: number; title: string }>;
  /** Fixed commitments from Constraints — shown on the timeline and block task placement. */
  constraints?: Constraint[];
  deadlines?: DeadlineTask[];
  /** Must-finish-before times from Constraints — matched to tasks by title. */
  deadlinePriorities?: DeadlinePriority[];
  /** Place the shortest task first to build momentum (motivation / start friction types). */
  leadWithQuickWin?: boolean;
};

const LUNCH_MINUTES = 30;

type BlockedSlot = { startMinutes: number; endMinutes: number; title?: string };

/** Parse "10:00 AM", "2:30 PM", "14:30", or "By 05:00 PM" → minutes from midnight. */
export function parseTimeToMinutes(timeStr: string): number | null {
  const trimmed = timeStr.trim().replace(/^by\s+/i, '');
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
  isQuickWin?: boolean;
  hasDeadline?: boolean;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function stripPartSuffix(title: string): string {
  return title.replace(/ \(Part \d+\)$/, '');
}

function titlesMatch(a: string, b: string): boolean {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  return left === right || left.includes(right) || right.includes(left);
}

/** Prefer tasks with imminent deadlines when capping how many fit in one day. */
export function selectTasksForSchedule(
  tasks: Task[],
  maxVisible: number,
  deadlines: DeadlineTask[] = [],
): Task[] {
  if (tasks.length <= maxVisible) return tasks;

  const ranked = tasks.map((task) => {
    const match = deadlines.find((d) => titlesMatch(d.title, task.text));
    const deadlineMinutes = match ? parseTimeToMinutes(match.deadline) : null;
    return { task, deadlineMinutes };
  });

  ranked.sort((a, b) => {
    if (a.deadlineMinutes != null && b.deadlineMinutes != null) {
      return a.deadlineMinutes - b.deadlineMinutes;
    }
    if (a.deadlineMinutes != null) return -1;
    if (b.deadlineMinutes != null) return 1;
    return 0;
  });

  return ranked.slice(0, maxVisible).map((entry) => entry.task);
}

export function buildDeadlinePriorities(deadlines: DeadlineTask[]): DeadlinePriority[] {
  return deadlines.flatMap((deadline) => {
    const deadlineMinutes = parseTimeToMinutes(deadline.deadline);
    if (deadlineMinutes == null) return [];
    return [{ taskTitle: deadline.title, deadlineMinutes }];
  });
}

function deadlineMinutesForUnit(
  unit: WorkUnit,
  deadlinePriorities: DeadlinePriority[],
): number | null {
  const baseTitle = stripPartSuffix(unit.title);
  const match = deadlinePriorities.find((d) => titlesMatch(d.taskTitle, baseTitle));
  return match?.deadlineMinutes ?? null;
}

function sortWorkUnits(
  units: WorkUnit[],
  tasks: Task[],
  hints: ScheduleHints,
  deadlinePriorities: DeadlinePriority[],
): WorkUnit[] {
  const taskIndex = (unit: WorkUnit) =>
    tasks.findIndex((t) => unit.taskId === t.id || unit.taskId.startsWith(`${t.id}-p`));

  return [...units].sort((a, b) => {
    const aDeadline = deadlineMinutesForUnit(a, deadlinePriorities);
    const bDeadline = deadlineMinutesForUnit(b, deadlinePriorities);

    if (aDeadline != null && bDeadline != null) return aDeadline - bDeadline;
    if (aDeadline != null) return -1;
    if (bDeadline != null) return 1;

    return orderingScore(b, taskIndex(b), hints) - orderingScore(a, taskIndex(a), hints);
  });
}

function applyQuickWinLead(units: WorkUnit[]): WorkUnit[] {
  if (units.length < 2) return units;

  const shortestIndex = units.reduce(
    (bestIdx, unit, index) =>
      unit.durationMinutes < units[bestIdx].durationMinutes ? index : bestIdx,
    0,
  );

  if (shortestIndex === 0) {
    return units.map((unit, index) =>
      index === 0 ? { ...unit, isQuickWin: true } : unit,
    );
  }

  const reordered = [...units];
  const [quickWin] = reordered.splice(shortestIndex, 1);
  reordered.unshift({ ...quickWin, isQuickWin: true });
  return reordered;
}

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

function timeStringToSortMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function sortBlocksByTime(blocks: ScheduleBlock[]): ScheduleBlock[] {
  return [...blocks].sort(
    (a, b) => timeStringToSortMinutes(a.time) - timeStringToSortMinutes(b.time),
  );
}

/** Fixed calendar commitments at their exact start times. */
export function buildConstraintBlocks(constraints: Constraint[] = []): ScheduleBlock[] {
  return constraints.flatMap((constraint) => {
    const startMinutes = parseTimeToMinutes(constraint.start);
    const endMinutes = parseTimeToMinutes(constraint.end);
    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return [];

    const durationMinutes = endMinutes - startMinutes;
    return [{
      id: `constraint-${constraint.id}`,
      time: minutesToTime(startMinutes),
      type: 'meeting',
      label: 'Fixed Commitment',
      title: constraint.title,
      description: `${constraint.start} – ${constraint.end} · locked on your day`,
      duration: durationLabel(durationMinutes),
      tag: 'Commitment',
      tagType: 'secondary',
    }];
  });
}

/** Deadline anchors on the timeline so due times are visible, not just sorting hints. */
export function buildDeadlineAnchorBlocks(deadlines: DeadlineTask[] = []): ScheduleBlock[] {
  return deadlines.flatMap((deadline) => {
    const deadlineMinutes = parseTimeToMinutes(deadline.deadline);
    if (deadlineMinutes == null) return [];

    const dueLabel = deadline.deadline.replace(/^by\s+/i, '').trim();
    return [{
      id: `deadline-${deadline.id}`,
      time: minutesToTime(deadlineMinutes),
      type: 'insight',
      label: 'Deadline',
      title: deadline.title,
      description: `Must finish by ${dueLabel}. Your work blocks are scheduled before this.`,
    }];
  });
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
  const {
    tasks,
    wakeTimeMinutes,
    sleepTimeMinutes,
    scheduleHints,
    blockedSlots = [],
    constraints = [],
    deadlines = [],
    deadlinePriorities = [],
    leadWithQuickWin = false,
  } = input;
  if (!tasks.length && constraints.length === 0 && deadlines.length === 0) {
    return { blocks: [], droppedTasks: [] };
  }
  if (!tasks.length) {
    return {
      blocks: sortBlocksByTime([
        ...buildConstraintBlocks(constraints),
        ...buildDeadlineAnchorBlocks(deadlines),
      ]),
      droppedTasks: [],
    };
  }

  let units = sortWorkUnits(
    expandTasks(tasks, scheduleHints),
    tasks,
    scheduleHints,
    deadlinePriorities,
  );

  units = units.map((unit) => ({
    ...unit,
    hasDeadline: deadlineMinutesForUnit(unit, deadlinePriorities) != null,
  }));

  if (leadWithQuickWin) {
    units = applyQuickWinLead(units);
  }

  const blocks: ScheduleBlock[] = [];
  const droppedTasks: GenerateScheduleResult['droppedTasks'] = [];
  const dayEnd = sleepTimeMinutes - 45;
  const peakStart = scheduleHints.peakFocusStartMinutes ?? wakeTimeMinutes + 45;
  const earliestStart = wakeTimeMinutes + 30;
  let cursor = Math.max(earliestStart, peakStart);
  if (cursor >= dayEnd - 30) {
    cursor = earliestStart;
  }
  let lunchInserted = false;
  const lunchTarget = wakeTimeMinutes + Math.floor((sleepTimeMinutes - wakeTimeMinutes) / 2);

  units.forEach((unit, index) => {
    if (!lunchInserted) {
      if (cursor > lunchTarget + 90) {
        lunchInserted = true;
      } else if (cursor >= lunchTarget - 30 && cursor >= wakeTimeMinutes + 180) {
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
    }

    cursor = advancePastBlock(cursor, unit.durationMinutes, blockedSlots);

    const deadlineMins = deadlineMinutesForUnit(unit, deadlinePriorities);
    if (deadlineMins != null && cursor + unit.durationMinutes > deadlineMins) {
      const idealStart = Math.max(wakeTimeMinutes + 15, deadlineMins - unit.durationMinutes);
      cursor = advancePastBlock(idealStart, unit.durationMinutes, blockedSlots);
    }

    if (cursor + unit.durationMinutes > dayEnd) {
      droppedTasks.push({ title: unit.title, durationMinutes: unit.durationMinutes });
      return;
    }

    blocks.push({
      id: unit.taskId,
      time: minutesToTime(cursor),
      type: 'deep_work',
      label: unit.isQuickWin ? 'Quick Win' : 'Deep Work Session',
      title: unit.title,
      description: unit.isQuickWin
        ? `${unit.durationMinutes} min momentum starter — finish this first, then the rest gets easier.`
        : unit.hasDeadline && deadlineMins != null
          ? `Must finish before ${minutesToTime(deadlineMins)} · focused block for ${unit.title}`
          : `Focused block for: ${unit.title}`,
      duration: durationLabel(unit.durationMinutes),
      tag: unit.isQuickWin ? 'Start Here' : unit.hasDeadline ? 'Deadline' : 'Your Task',
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
    blocks: sortBlocksByTime([
      ...blocks,
      ...buildConstraintBlocks(constraints),
      ...buildDeadlineAnchorBlocks(deadlines),
    ]),
    droppedTasks,
  };
}
