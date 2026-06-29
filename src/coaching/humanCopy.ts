/**
 * Human coaching copy — plain language only.
 * Internal signal IDs never appear in user-facing strings.
 */

export const INSUFFICIENT_DATA_MESSAGE =
  "I'm still learning your patterns. Complete more tasks so I can provide personalized coaching.";

/** Minimum completed focus sessions before personalized coaching kicks in. */
export const MIN_COMPLETED_FOR_COACHING = 1;

export const DAY1_OBSERVATION: Record<string, string> = {
  overwhelmed_tasks:  "You've told me large tasks feel overwhelming — so I'll keep your blocks small and your list short.",
  waiting_motivation: "You tend to wait for motivation before starting. I'll front-load your day with quick wins to build momentum.",
  dont_know_start:    "When tasks feel ambiguous you stall. I'll make sure every block has a clear first action.",
  easily_distracted:  "Distractions pull you off track. I'll protect your peak focus window and keep context-switching low.",
  changing_plans:     "You told me you often change your plans. I'll lock in a minimal schedule first, then we can refine it.",
  underestimate_time: "You tend to underestimate how long tasks take. I've added buffers so you're not racing the clock.",
};

export const DAY1_ACTION: Record<string, string> = {
  overwhelmed_tasks:  "Start with the first block on your schedule — it's already sized for you.",
  waiting_motivation: "Don't wait to feel ready. Open your first task right now and set a 10-minute timer.",
  dont_know_start:    "Pick the top task on your schedule and write down the first physical action in one sentence.",
  easily_distracted:  "Put your phone face-down and close everything except this session before you start.",
  changing_plans:     "Commit to today's schedule as built. Note any changes you want — but don't act on them until the session ends.",
  underestimate_time: "Your first block is time-boxed. Stop when the timer ends, not when the task feels done.",
};

export const DAY1_FALLBACK_OBSERVATION = "You've set up your first schedule. Let's see how today goes.";
export const DAY1_FALLBACK_ACTION      = "Start your first focus block now — that's how I learn what works for you.";

export const PATTERN_PLAIN: Record<string, string> = {
  high_skip_rate: 'You often put tasks off instead of finishing them.',
  plan_instability: 'You tend to shuffle tasks after you\'ve already planned your day.',
  start_delay: 'There\'s usually a long gap between adding a task and actually starting it.',
  low_follow_through: 'A lot of what you plan doesn\'t get finished.',
  failure_avoidance: 'You skip more when a task feels important or stressful.',
  healthy_rhythm: 'You\'re finishing tasks at a steady pace right now.',
  evening_slip: 'Tasks you leave for the evening are the ones most likely to slip.',
  long_block_stall: 'Longer tasks are harder for you to get started on.',
  morning_edge: 'You get more done in the morning than later in the day.',
};

export const ACTION_BY_SIGNAL: Record<string, string> = {
  high_skip_rate: 'Tomorrow, pick just one must-do task and finish it before anything else.',
  plan_instability: 'Tonight, set tomorrow\'s first two time blocks — and don\'t move them until one is done.',
  start_delay: 'When you add a task tomorrow, start a 10-minute timer right away — don\'t wait to feel ready.',
  low_follow_through: 'Tomorrow, put only three tasks on your list and finish the hardest one first.',
  failure_avoidance: 'Tomorrow, do a messy 15-minute start on your hardest task — progress beats perfection.',
  healthy_rhythm: 'Keep your hardest task in the first half of tomorrow — that\'s when you finish most.',
  evening_slip: 'Move anything important to the morning tomorrow — your evenings are where tasks slip.',
  long_block_stall: 'Break your longest task into a 25-minute block tomorrow and stop when the timer ends.',
  morning_edge: 'Schedule your hardest task early tomorrow — that\'s when you\'re most likely to finish it.',
};

export const DEEP_ACTION_BY_SIGNAL: Record<string, string> = {
  high_skip_rate: 'This week, cap your daily list at three tasks until your finish rate improves.',
  plan_instability: 'Pick one "anchor block" each morning and refuse to reschedule it.',
  start_delay: 'Use a 10-minute "start rule": no task sits on your list more than 10 minutes before you begin.',
  low_follow_through: 'Review Sunday night — remove any task that\'s been pushed more than twice.',
  failure_avoidance: 'Name the smallest acceptable version of each hard task before you schedule it.',
  healthy_rhythm: 'Protect your best window — put deep work there and keep meetings out of it.',
  evening_slip: 'After 5 PM, only allow easy wins — hard work belongs in the morning.',
  long_block_stall: 'No task over 45 minutes without a planned break halfway through.',
  morning_edge: 'Block 90 minutes tomorrow morning before checking messages or email.',
};

export const WEEKLY_ACTION_BY_SIGNAL: Record<string, string> = {
  high_skip_rate: 'Next week, finish one task before adding a new one each day.',
  plan_instability: 'Next week, write Monday\'s schedule on Sunday and change it only once.',
  start_delay: 'Next week, track how long you wait to start — aim to cut that wait in half.',
  low_follow_through: 'Next week, end each day with no more than two open tasks.',
  failure_avoidance: 'Next week, start one "imperfect" session per day on your scariest task.',
  healthy_rhythm: 'Next week, repeat what worked on your best day — same start time, same first task.',
  evening_slip: 'Next week, move every important task to before 2 PM.',
  long_block_stall: 'Next week, split every task over an hour into two sessions.',
  morning_edge: 'Next week, stack your three hardest tasks on your strongest morning.',
};

export const FOCUS_ACTION = {
  start: (task: string) => `Stay with "${task}" until the timer ends — that's the whole job right now.`,
  midway: (task: string) => `You're halfway through "${task}". Finish this block before you switch.`,
  complete: (task: string) => `Nice — "${task}" is done. Take a short break, then pick your next block.`,
};

export const SCHEDULE_BANNER_ACTION = (hardest: string | null) =>
  hardest
    ? `Put "${hardest}" first tomorrow — tackle it while your energy is highest.`
    : 'Put your hardest task first tomorrow — tackle it while your energy is highest.';
