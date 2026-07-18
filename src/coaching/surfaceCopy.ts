import type { CoachingContext, CoachingMessage, CoachingOptions, CoachingSurface } from './types';
import {
  INSUFFICIENT_DATA_MESSAGE,
  DAY1_OBSERVATION,
  DAY1_ACTION,
  DAY1_FALLBACK_OBSERVATION,
  DAY1_FALLBACK_ACTION,
  PATTERN_PLAIN,
  ACTION_BY_SIGNAL,
  DEEP_ACTION_BY_SIGNAL,
  WEEKLY_ACTION_BY_SIGNAL,
  FOCUS_ACTION,
  SCHEDULE_BANNER_ACTION,
} from './humanCopy';
import {
  hasEnoughBehavioralData,
  primarySignal,
  secondarySignal,
  todayActivity,
  weekTotals,
  strongestWeekday,
  weakestWeekday,
  hardestTaskTitle,
  beforeNoonShare,
} from './signals';
import { applyCoachTone } from './tone';

function msg(
  observation: string,
  pattern: string,
  action: string,
  ctx: CoachingContext,
): CoachingMessage {
  const style = (ctx.onboardingProfile.coachStyle ?? 'balanced') as 'supportive' | 'balanced' | 'strict';
  const o = applyCoachTone(style, 'observation', observation);
  const p = pattern ? applyCoachTone(style, 'pattern', pattern) : '';
  const a = applyCoachTone(style, 'action', action);
  return {
    observation: o,
    pattern: p,
    action: a,
    summary: [o, p, a].filter(Boolean).join(' '),
    dataSource: hasEnoughBehavioralData(ctx) ? 'behavioral' : 'profile_tasks',
    generatedAt: new Date().toISOString(),
  };
}

function insufficient(surface: CoachingSurface, ctx: CoachingContext): CoachingMessage {
  if (
    surface === 'daily_summary' ||
    surface === 'schedule_banner' ||
    surface === 'focus_start'
  ) {
    const pt          = ctx.onboardingProfile.procrastinationType ?? '';
    const observation = DAY1_OBSERVATION[pt] ?? DAY1_FALLBACK_OBSERVATION;
    const action      = DAY1_ACTION[pt]      ?? DAY1_FALLBACK_ACTION;
    return msg(observation, '', action, ctx);
  }

  const actions: Partial<Record<CoachingSurface, string>> = {
    deep_analysis:    'Complete a few more focus sessions — then I can spot what\'s holding you back.',
    weekly_report:    'Finish at least one task per day this week so I can read your rhythm.',
    pattern_analysis: 'Log a few more completions and I\'ll show you what\'s working.',
    focus_midway:     'Keep going — you\'re halfway there.',
    focus_complete:   'Session logged. Come back tomorrow and I\'ll have more to tell you.',
  };
  return msg(
    INSUFFICIENT_DATA_MESSAGE,
    '',
    actions[surface] ?? 'Complete a few focus sessions this week.',
    ctx,
  );
}

  function injectTask(action: string, task: string | null): string {
    if (!task) return action;
    return action.replace(/your hardest task|Hardest task/gi, `"${task}"`);
  }

function buildDaily(ctx: CoachingContext): CoachingMessage {
  if (!hasEnoughBehavioralData(ctx)) return insufficient('daily_summary', ctx);

  const signal = primarySignal(ctx);
  const today = todayActivity(ctx);
  const hardest = hardestTaskTitle(ctx);

  let observation: string;
  if (today && (today.completed > 0 || today.skipped > 0)) {
    if (today.completed > 0 && today.skipped === 0) {
      observation = `You finished ${today.completed} task${today.completed === 1 ? '' : 's'} today.`;
    } else if (today.completed === 0 && today.skipped > 0) {
      observation = `You skipped ${today.skipped} task${today.skipped === 1 ? '' : 's'} today.`;
    } else {
      observation = `Today you finished ${today.completed} and skipped ${today.skipped}.`;
    }
  } else if (ctx.metrics.currentStreak > 1) {
    observation = `You're on a ${ctx.metrics.currentStreak}-day streak of finishing tasks.`;
  } else {
    const noon = beforeNoonShare(ctx);
    if (noon != null && noon >= 0.6) {
      observation = 'Most of your finished tasks happen before lunch.';
    } else {
      observation = `You've finished ${ctx.metrics.tasksCompleted} task${ctx.metrics.tasksCompleted === 1 ? '' : 's'} recently.`;
    }
  }

  const pattern = PATTERN_PLAIN[signal] ?? PATTERN_PLAIN.healthy_rhythm;
  const action = injectTask(ACTION_BY_SIGNAL[signal] ?? ACTION_BY_SIGNAL.healthy_rhythm, hardest);

  return msg(observation, pattern, action, ctx);
}

function buildDeep(ctx: CoachingContext): CoachingMessage {
  if (!hasEnoughBehavioralData(ctx)) return insufficient('deep_analysis', ctx);

  const signal = secondarySignal(ctx);
  const primary = primarySignal(ctx);
  const { completed, skipped, denom } = weekTotals(ctx);
  const hardest = hardestTaskTitle(ctx);

  let observation: string;
  if (ctx.metrics.tasksRescheduled >= 3) {
    observation = `You've moved ${ctx.metrics.tasksRescheduled} tasks after planning them this month.`;
  } else if (denom > 0) {
    const rate = Math.round((completed / denom) * 100);
    observation = `Over the past week you finished ${completed} of ${denom} tasks you started (${rate}%).`;
  } else {
    observation = `You've finished ${ctx.metrics.tasksCompleted} tasks in recent sessions.`;
  }

  // Different pattern than daily — secondary signal
  const pattern = PATTERN_PLAIN[signal] ?? PATTERN_PLAIN.healthy_rhythm;

  const action = injectTask(
    DEEP_ACTION_BY_SIGNAL[signal] ?? DEEP_ACTION_BY_SIGNAL.healthy_rhythm,
    hardest,
  );

  return msg(observation, pattern, action, ctx);
}

function buildWeekly(ctx: CoachingContext): CoachingMessage {
  if (!hasEnoughBehavioralData(ctx)) return insufficient('weekly_report', ctx);

  const { completed, skipped, denom } = weekTotals(ctx);
  const strongest = strongestWeekday(ctx);
  const weakest = weakestWeekday(ctx);
  const signal = primarySignal(ctx);

  const observation = denom > 0
    ? `This week you finished ${completed} task${completed === 1 ? '' : 's'}${skipped > 0 ? ` and skipped ${skipped}` : ''}.`
    : `This week you finished ${completed} task${completed === 1 ? '' : 's'}.`;

  let pattern: string;
  if (strongest && weakest && strongest.day !== weakest.day) {
    pattern = `${strongest.day} was your strongest day (${strongest.count} finished). ${weakest.day} was toughest — only ${weakest.rate}% got done.`;
  } else if (strongest) {
    pattern = `${strongest.day} was your best day this week — you finished ${strongest.count} task${strongest.count === 1 ? '' : 's'}.`;
  } else {
    pattern = PATTERN_PLAIN[signal] ?? PATTERN_PLAIN.healthy_rhythm;
  }

  let action: string;
  if (weakest) {
    action = `Next week, put your hardest work on ${weakest.day} morning — that's when you need the most help.`;
  } else {
    action = WEEKLY_ACTION_BY_SIGNAL[signal] ?? WEEKLY_ACTION_BY_SIGNAL.healthy_rhythm;
  }

  return msg(observation, pattern, action, ctx);
}

function buildPatternAnalysis(ctx: CoachingContext): CoachingMessage {
  if (!hasEnoughBehavioralData(ctx)) return insufficient('pattern_analysis', ctx);

  const ranked = [primarySignal(ctx), secondarySignal(ctx)];
  const a = ranked[0];
  const b = ranked[1];

  const skipPattern = ctx.insights.procrastinationPatterns.find(
    (p) => p.evidence.includes('skip reason') || p.label.toLowerCase().includes('skip'),
  );

  const observation = skipPattern
    ? skipPattern.description
    : ctx.metrics.tasksSkipped > 0
      ? `You skipped ${ctx.metrics.tasksSkipped} task${ctx.metrics.tasksSkipped === 1 ? '' : 's'} recently — I'm watching what triggers that.`
      : `You finished ${ctx.metrics.tasksCompleted} tasks with few skips — your follow-through is solid.`;

  const pattern = a !== b
    ? `${PATTERN_PLAIN[a]} Also: ${(PATTERN_PLAIN[b] ?? '').charAt(0).toLowerCase()}${(PATTERN_PLAIN[b] ?? '').slice(1)}`
    : PATTERN_PLAIN[a] ?? PATTERN_PLAIN.healthy_rhythm;

  const action = WEEKLY_ACTION_BY_SIGNAL[a] ?? ACTION_BY_SIGNAL[a] ?? ACTION_BY_SIGNAL.healthy_rhythm;

  return msg(observation, pattern, action, ctx);
}

function buildFocus(
  ctx: CoachingContext,
  surface: 'focus_start' | 'focus_midway' | 'focus_complete',
  options?: CoachingOptions,
): CoachingMessage {
  const task = options?.currentTaskTitle ?? 'this task';

  if (!hasEnoughBehavioralData(ctx)) {
    if (surface === 'focus_midway') {
      return msg('', '', FOCUS_ACTION.midway(task), ctx);
    }
    if (surface === 'focus_complete') {
      return msg('', '', FOCUS_ACTION.complete(task), ctx);
    }
    return insufficient('focus_start', ctx);
  }

  if (surface === 'focus_midway') {
    return msg('', '', FOCUS_ACTION.midway(task), ctx);
  }
  if (surface === 'focus_complete') {
    return msg(`"${task}" is done.`, '', FOCUS_ACTION.complete(task), ctx);
  }

  const signal = primarySignal(ctx);
  const observation = options?.durationMinutes && options.durationMinutes >= 60
    ? `"${task}" is a long block — just finish the next 25 minutes.`
    : `You're working on "${task}" now.`;

  const pattern = signal === 'long_block_stall'
    ? PATTERN_PLAIN.long_block_stall
    : '';

  return msg(observation, pattern, FOCUS_ACTION.start(task), ctx);
}

function buildScheduleBanner(ctx: CoachingContext): CoachingMessage {
  if (!hasEnoughBehavioralData(ctx)) return insufficient('schedule_banner', ctx);

  const hardest = hardestTaskTitle(ctx);
  const signal = primarySignal(ctx);
  const observation = PATTERN_PLAIN[signal] ?? PATTERN_PLAIN.healthy_rhythm;
  const action = injectTask(
    ACTION_BY_SIGNAL[signal] ?? SCHEDULE_BANNER_ACTION(hardest),
    hardest,
  );

  return msg(observation, '', action, ctx);
}

export function buildSurfaceCoaching(
  surface: CoachingSurface,
  ctx: CoachingContext,
  options?: CoachingOptions,
  _isPremium = false,
): CoachingMessage {
  switch (surface) {
    case 'daily_summary':
      return buildDaily(ctx);
    case 'deep_analysis':
      return buildDeep(ctx);
    case 'weekly_report':
      return buildWeekly(ctx);
    case 'pattern_analysis':
      return buildPatternAnalysis(ctx);
    case 'schedule_banner':
      return buildScheduleBanner(ctx);
    case 'focus_start':
    case 'focus_midway':
    case 'focus_complete':
      return buildFocus(ctx, surface, options);
    default:
      return buildDaily(ctx);
  }
}
