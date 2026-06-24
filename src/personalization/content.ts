/**
 * All UI strings organised by CoachStyle and ProcrastinationType.
 * No screen should hardcode copy — import from here instead.
 */
import type { ProcrastinationType, CoachStyle, CoachingMessages } from './types';

// ─── Greeting copy (time-aware + coach-style) ──────────────────────────────────
type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'night';

export const GREETINGS: Record<CoachStyle | 'default', Record<TimeSlot, string>> = {
  strict: {
    morning:   'Your focus window is open.',
    afternoon: 'The clock is ticking.',
    evening:   'Make the final hours count.',
    night:     'Plan tomorrow before you sleep.',
  },
  supportive: {
    morning:   'Good morning! Ready to build something great?',
    afternoon: 'Hey, you\'re doing wonderfully!',
    evening:   'Still showing up. That means everything.',
    night:     'Rest well — tomorrow is a fresh start.',
  },
  balanced: {
    morning:   'Let\'s build a productive day.',
    afternoon: 'Good afternoon. Let\'s check your priorities.',
    evening:   'Evening planning sets tomorrow up for success.',
    night:     'Wind down with a plan for tomorrow.',
  },
  default: {
    morning:   'Good morning.',
    afternoon: 'Good afternoon.',
    evening:   'Good evening.',
    night:     'Good night.',
  },
};

// ─── Dashboard subtext (coach-style × procrastination type) ──────────────────
export const SUBTEXTS: Record<CoachStyle | 'default', Record<ProcrastinationType | 'default', string>> = {
  strict: {
    overwhelmed_tasks:  'Break it into parts — then start the first one now.',
    waiting_motivation: 'Stop waiting. Motivation follows action, not the other way around.',
    dont_know_start:    'Pick the most obvious first step and execute it immediately.',
    easily_distracted:  'Remove distractions. Block time. Execute.',
    changing_plans:     'Commit to the plan. Re-planning is procrastination in disguise.',
    underestimate_time: 'Add 50% to your estimate and hold yourself to that deadline.',
    default:            'What needs to get done? Add it.',
  },
  supportive: {
    overwhelmed_tasks:  'Just one small piece. You don\'t have to do it all right now.',
    waiting_motivation: 'You don\'t need to feel ready — just take one small step.',
    dont_know_start:    'Let\'s find your starting point together. Any step forward counts.',
    easily_distracted:  'Let\'s create a calm, focused space for you today.',
    changing_plans:     'Let\'s build one simple plan and trust it. You\'ve got this.',
    underestimate_time: 'Let\'s be realistic with time — better to finish early than rush.',
    default:            'What\'s on your mind? I\'m here to help.',
  },
  balanced: {
    overwhelmed_tasks:  'Break large tasks into timed blocks — start with 25 minutes.',
    waiting_motivation: 'Schedule the first task now. Starting is the hardest part.',
    dont_know_start:    'Identify your most important task and put it first on the list.',
    easily_distracted:  'Deep-work blocks minimise external interruptions.',
    changing_plans:     'Today\'s plan is final. Adapt tomorrow — execute today.',
    underestimate_time: 'Add a buffer to each estimate — your schedule will stay honest.',
    default:            'What are your priorities today?',
  },
  default: {
    overwhelmed_tasks:  'Break it down — smaller tasks are easier to start.',
    waiting_motivation: 'Start before you feel ready. Momentum follows action.',
    dont_know_start:    'Pick anything and begin — clarity comes from doing.',
    easily_distracted:  'Let\'s create focused blocks for your day.',
    changing_plans:     'Commit to today\'s plan and follow through.',
    underestimate_time: 'Build in buffer time — accurate estimates reduce stress.',
    default:            'Add your tasks and let\'s build your day.',
  },
};

// ─── Motivational quotes (5 per style, rotated by day-of-week) ────────────────
export const QUOTES: Record<CoachStyle | 'default', string[]> = {
  strict: [
    'Stop waiting for motivation. Start, and motivation will follow.',
    'Discipline is choosing between what you want now and what you want most.',
    'Done is better than perfect. Execute and move on.',
    'The task you resist most is the one you need to do first.',
    'Your future depends on what you do today — not tomorrow.',
  ],
  supportive: [
    'You don\'t have to do it all — just start.',
    'Progress, not perfection. Every step counts.',
    'Be gentle with yourself. Sustainable beats sprint.',
    'Small wins compound into big results over time.',
    'One good day builds the next.',
  ],
  balanced: [
    'What gets scheduled gets done.',
    'Plan the work. Work the plan.',
    'Consistency beats intensity over time.',
    'Clarity before action. Preparation before execution.',
    'Momentum doesn\'t create tasks. It creates realistic execution plans.',
  ],
  default: [
    'Small steps lead to big results.',
    'Clarity turns intention into action.',
    'Every productive day starts with a clear list.',
    'What you schedule, you complete.',
    'Progress is built one task at a time.',
  ],
};

// ─── Empty state messages ──────────────────────────────────────────────────────
export const EMPTY_STATES: Record<CoachStyle | 'default', string> = {
  strict:    'No tasks. No execution. No momentum.\nAdd your first task now.',
  supportive:'What\'s on your mind today?\nAdd anything — big or small — and let\'s build from there.',
  balanced:  'Add your tasks for today.\nMomentum will build your optimal schedule.',
  default:   'Momentum doesn\'t create tasks.\nIt creates realistic execution plans.',
};

// ─── Coaching messages ─────────────────────────────────────────────────────────
export const COACHING: Record<CoachStyle | 'default', CoachingMessages> = {
  strict: {
    addFirstTask:       'Add your most challenging task first.',
    capacityRealistic:  'Capacity available — you have room to push harder.',
    capacityOverloaded: 'Overloaded means under-prioritised. Cut what doesn\'t matter.',
    focusStart:         'Your focus window starts now. No distractions.',
    focusMidway:        'Stay locked in. Don\'t break your concentration.',
    focusComplete:      'Task complete. Move to the next one immediately.',
    dailySummary:       'Results define the day. What did you actually finish?',
  },
  supportive: {
    addFirstTask:       'What\'s one thing that would make today feel successful?',
    capacityRealistic:  'Your plan looks great — you\'ve got this! 🎉',
    capacityOverloaded: 'That\'s a lot on your plate. What can you move to tomorrow?',
    focusStart:         'Let\'s build some momentum together. You\'re ready for this.',
    focusMidway:        'You\'re doing amazing! Keep that energy going.',
    focusComplete:      'Well done! Take a moment to celebrate that win.',
    dailySummary:       'Look at everything you accomplished today. That\'s real progress.',
  },
  balanced: {
    addFirstTask:       'Start by adding your most important task for today.',
    capacityRealistic:  'Your workload looks balanced and achievable.',
    capacityOverloaded: 'You\'re over capacity. Consider deferring lower-priority items.',
    focusStart:         'Focus time. Execute with intention.',
    focusMidway:        'On track. Maintain your focus.',
    focusComplete:      'Task complete. Good execution. What\'s next?',
    dailySummary:       'Solid execution today. Review what worked and carry it forward.',
  },
  default: {
    addFirstTask:       'Add your first task to get started.',
    capacityRealistic:  'Your schedule looks realistic.',
    capacityOverloaded: 'You may be over capacity for today.',
    focusStart:         'Starting your focus session.',
    focusMidway:        'Keep going — you\'re making progress.',
    focusComplete:      'Task complete!',
    dailySummary:       'Good work today.',
  },
};

// ─── Schedule rationale (shown as a banner on the schedule screen) ─────────────
export const SCHEDULE_RATIONALE: Partial<Record<ProcrastinationType, string>> & { default: string } = {
  overwhelmed_tasks:  'Large tasks are broken into focused blocks so nothing feels impossible to start.',
  waiting_motivation: 'Your first task is scheduled immediately — starting creates the motivation you need.',
  dont_know_start:    'Tasks are ordered with a clear entry point so you always know exactly what to do next.',
  easily_distracted:  'Deep-focus blocks are placed during your quietest hours to protect your attention.',
  changing_plans:     'Your schedule is locked for today — one committed plan beats ten revised ones.',
  underestimate_time: 'Each task includes built-in buffer time so your schedule stays realistic all day.',
  default:            'Tasks are ordered by priority and time-matched for maximum flow.',
};

// ─── Tone badge labels ─────────────────────────────────────────────────────────
export const BADGE_LABELS: Record<CoachStyle | 'default', string> = {
  strict:    'Strict Mode',
  supportive:'Support Mode',
  balanced:  'Balanced',
  default:   'Default',
};

export const BADGE_COLORS: Record<CoachStyle | 'default', string> = {
  strict:    '#dc2626', // red-600
  supportive:'#16a34a', // green-600
  balanced:  '#2563eb', // blue-600
  default:   '#6b7280', // gray-500
};

// ─── Welcome card content (shown once after onboarding) ───────────────────────
export interface WelcomeStep { icon: string; text: string; }
export interface WelcomeCardContent {
  headline:    string;
  tagline:     string;
  description: string;
  heroIcon:    string;
  steps:       WelcomeStep[];
}

export const WELCOME_CARDS: Record<CoachStyle | 'default', WelcomeCardContent> = {
  strict: {
    heroIcon:    'gavel',
    tagline:     'No excuses. Just execution.',
    headline:    "You're running on Strict Mode.",
    description: "Momentum will hold you accountable and prioritize execution above all else. Expect direct language, clear priorities, and zero fluff.",
    steps: [
      { icon: 'format-list-checks',    text: 'Add every task honestly — no sugarcoating your workload.' },
      { icon: 'clock-alert-outline',   text: 'Set your real constraints — wake time, sleep, fixed blocks.' },
      { icon: 'lightning-bolt',        text: 'Execute the plan without re-scheduling unless absolutely necessary.' },
    ],
  },
  supportive: {
    heroIcon:    'hand-heart',
    tagline:     'Every small win builds momentum.',
    headline:    "You're in Support Mode.",
    description: "Momentum will help you build consistency through encouragement, positive reinforcement, and celebrating every small win along the way.",
    steps: [
      { icon: 'playlist-plus',         text: 'Add anything on your mind — big goals or tiny tasks.' },
      { icon: 'heart-pulse',           text: 'Let Momentum pace your day realistically around your energy.' },
      { icon: 'star-circle-outline',   text: 'Celebrate each completed task — every win compounds.' },
    ],
  },
  balanced: {
    heroIcon:    'scale-balance',
    tagline:     'Consistent progress, sustainable pace.',
    headline:    "You're in Balanced Mode.",
    description: "Momentum combines accountability with flexibility — keeping you consistently moving forward without burning out.",
    steps: [
      { icon: 'format-list-bulleted',  text: 'Add your tasks and identify your top 1-3 priorities.' },
      { icon: 'calendar-check-outline',text: "Review your schedule — it's built for your peak rhythm." },
      { icon: 'refresh',               text: 'Adapt when needed, but always execute your core tasks.' },
    ],
  },
  default: {
    heroIcon:    'lightning-bolt',
    tagline:     'Schedules you\'ll actually follow.',
    headline:    'Welcome to Momentum.',
    description: 'Momentum creates realistic schedules built around your tasks, energy levels, and real-world constraints.',
    steps: [
      { icon: 'playlist-plus',         text: 'Add your tasks for today.' },
      { icon: 'clock-outline',         text: 'Set your availability and any fixed commitments.' },
      { icon: 'lightning-bolt',        text: 'Generate your personalized daily schedule.' },
    ],
  },
};
