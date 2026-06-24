export interface ScheduleBlock {
  id: string;
  time: string;
  type: 'deep_work' | 'break' | 'meeting' | 'productivity' | 'insight';
  label: string;
  title: string;
  description: string;
  duration?: string;
  tag?: string;
  tagType?: 'primary' | 'secondary' | 'tertiary';
}

export interface Constraint {
  id: string;
  title: string;
  start: string;
  end: string;
  color: 'primary' | 'secondary';
}

export interface DeadlineTask {
  id: string;
  title: string;
  deadline: string;
}

export const MOCK_SCHEDULE: ScheduleBlock[] = [
  {
    id: '1',
    time: '08:00',
    type: 'deep_work',
    label: 'Deep Work Session',
    title: 'Physics Revision',
    description: 'Waves, optics, and modern physics. High-focus block for complex concept mastery.',
    duration: '90m',
    tag: 'Study',
    tagType: 'primary',
  },
  {
    id: '2',
    time: '09:30',
    type: 'break',
    label: 'Cognitive Reset',
    title: 'Break',
    description: '15 min break · Hydration & Movement',
    duration: '15m',
  },
  {
    id: '3',
    time: '09:45',
    type: 'deep_work',
    label: 'Deep Work Session',
    title: 'Maths Mock Test',
    description: 'Full-length practice test under timed conditions. Prioritized due to upcoming exam.',
    duration: '120m',
    tag: 'Study',
    tagType: 'primary',
  },
  {
    id: '4',
    time: '12:00',
    type: 'insight',
    label: 'Momentum Insight',
    title: 'Insight',
    description: 'Your focus peak ends at 11:45 AM. Gym scheduled for afternoon energy recovery.',
  },
  {
    id: '5',
    time: '12:30',
    type: 'productivity',
    label: 'Productivity Block',
    title: 'Gym',
    description: 'Physical workout. Scheduled during energy dip for recovery and momentum boost.',
    duration: '60m',
    tag: 'Health',
    tagType: 'tertiary',
  },
  {
    id: '6',
    time: '14:00',
    type: 'break',
    label: 'Recovery',
    title: 'Lunch & Rest',
    description: '30 min · Nutrition and mental recharge',
    duration: '30m',
  },
  {
    id: '7',
    time: '14:30',
    type: 'meeting',
    label: 'Practice Session',
    title: 'Music Practice',
    description: 'Guitar scales and new compositions. Scheduled in afternoon for creative flow state.',
    duration: '60m',
    tag: 'Creative',
    tagType: 'secondary',
  },
];

export const MOCK_CONSTRAINTS: Constraint[] = [
  {
    id: '1',
    title: 'Physics Class',
    start: '10:00 AM',
    end: '11:00 AM',
    color: 'primary',
  },
  {
    id: '2',
    title: 'Gym Session',
    start: '12:30 PM',
    end: '01:30 PM',
    color: 'secondary',
  },
];

export const MOCK_DEADLINES: DeadlineTask[] = [
  {
    id: '1',
    title: 'Maths Mock Test Revision',
    deadline: 'By 05:00 PM',
  },
  {
    id: '2',
    title: 'Physics Assignment',
    deadline: 'By 08:00 PM',
  },
];

export const ONBOARDING_OPTIONS = {
  procrastinationTypes: [
    { key: 'overwhelmed_tasks',  label: 'I feel overwhelmed by large tasks',        icon: 'layers_clear' },
    { key: 'waiting_motivation', label: 'I keep waiting for motivation',             icon: 'timer_sand' },
    { key: 'dont_know_start',    label: "I don't know where to start",               icon: 'compass_off' },
    { key: 'easily_distracted',  label: 'I get distracted easily',                   icon: 'notifications_paused' },
    { key: 'changing_plans',     label: 'I keep changing my plans',                  icon: 'calendar_refresh' },
    { key: 'underestimate_time', label: 'I underestimate how long tasks take',       icon: 'clock_alert' },
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

export const AI_STEPS = [
  { text: 'Reviewing workload...', progress: 0.25 },
  { text: 'Detecting procrastination risks...', progress: 0.5 },
  { text: 'Optimizing schedule...', progress: 0.75 },
  { text: 'Finding realistic balance...', progress: 1.0 },
];
