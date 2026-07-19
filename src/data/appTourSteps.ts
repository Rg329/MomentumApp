export type AppTourStep = {
  icon: string;
  title: string;
  body: string;
  tab?: string;
};

export const APP_TOUR_STEPS: AppTourStep[] = [
  {
    icon: 'lightning-bolt',
    tab: 'Focus',
    title: 'Plan your day',
    body: 'Add what you need to do and how long it might take. This is your brain dump — keep it honest and small enough to finish.',
  },
  {
    icon: 'tune',
    title: 'Set constraints',
    body: 'Add fixed commitments (classes, meetings) and deadlines before generating. They appear on your timeline and shape the plan.',
  },
  {
    icon: 'star-four-points',
    title: 'Generate your schedule',
    body: 'Momentum turns tasks into a realistic timetable with breaks, peak-focus placement, and coaching tuned to how you work.',
  },
  {
    icon: 'calendar-clock',
    tab: 'Schedule',
    title: 'Follow your timeline',
    body: 'Your day lives here. Tap a block to check in, start focus mode, mark done, or skip with a reason.',
  },
  {
    icon: 'chart-line',
    tab: 'Insights',
    title: 'Learn your patterns',
    body: 'Completion, skips, and streaks feed coaching that gets smarter over time — especially after a few real days of use.',
  },
];
