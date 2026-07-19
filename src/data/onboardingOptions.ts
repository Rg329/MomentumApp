export const ONBOARDING_OPTIONS = {
  procrastinationTypes: [
    { key: 'overwhelmed_tasks',  label: 'I feel overwhelmed by large tasks',        icon: 'layers_clear' },
    { key: 'waiting_motivation', label: 'I keep waiting for motivation',             icon: 'timer_sand' },
    { key: 'dont_know_start',    label: "I don't know where to start",               icon: 'compass_off' },
    { key: 'easily_distracted',  label: 'I get distracted easily',                   icon: 'notifications_paused' },
    { key: 'changing_plans',     label: 'I keep changing my plans',                  icon: 'calendar_refresh' },
    { key: 'underestimate_time', label: 'I always underestimate how long tasks take', icon: 'clock_alert' },
  ],
  peakTime: [
    { key: 'morning',   label: 'Morning',   icon: 'wb_sunny' },
    { key: 'afternoon', label: 'Afternoon', icon: 'light_mode' },
    { key: 'evening',   label: 'Evening',   icon: 'bedtime' },
  ],
  coaching: [
    { key: 'supportive', label: 'Supportive', icon: 'favorite', desc: 'Encouraging nudges and positive reinforcement.' },
    { key: 'balanced',   label: 'Balanced', icon: 'balance',  desc: 'Practical guidance with an objective focus.' },
    { key: 'strict',     label: 'Strict',   icon: 'gavel',    desc: 'Firm accountability and no-nonsense feedback.' },
  ],
};
