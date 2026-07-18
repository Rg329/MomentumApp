/** Three starter tasks shown on first Plan visit — keyed by onboarding procrastination type. */
export type StarterTask = { text: string; durationMinutes: number };

export const STARTER_TASKS_BY_TYPE: Record<string, StarterTask[]> = {
  overwhelmed_tasks: [
    { text: 'Smallest next step on one project', durationMinutes: 20 },
    { text: 'Reply to 2 important messages', durationMinutes: 15 },
    { text: '10-minute desk tidy', durationMinutes: 10 },
  ],
  waiting_motivation: [
    { text: 'Open the file and read for 5 min', durationMinutes: 15 },
    { text: 'Write the first paragraph', durationMinutes: 25 },
    { text: 'Do the easiest part first', durationMinutes: 20 },
  ],
  dont_know_start: [
    { text: 'Write step 1 on paper', durationMinutes: 15 },
    { text: 'Gather materials you need', durationMinutes: 20 },
    { text: 'Sketch a quick outline', durationMinutes: 25 },
  ],
  easily_distracted: [
    { text: '25-min phone-free focus block', durationMinutes: 25 },
    { text: 'Single-task email cleanup', durationMinutes: 20 },
    { text: 'One chapter / one lesson', durationMinutes: 30 },
  ],
  changing_plans: [
    { text: 'Lock in top priority for today', durationMinutes: 15 },
    { text: 'Finish one thing before switching', durationMinutes: 30 },
    { text: 'Write a 3-line plan for today', durationMinutes: 10 },
  ],
  underestimate_time: [
    { text: 'Task with a hard stop timer', durationMinutes: 45 },
    { text: 'Break one project into 3 steps', durationMinutes: 20 },
    { text: 'Track time on one assignment', durationMinutes: 40 },
  ],
};

export const DEFAULT_STARTER_TASKS: StarterTask[] = [
  { text: 'Deep work on top priority', durationMinutes: 45 },
  { text: 'Admin and quick replies', durationMinutes: 20 },
  { text: 'Review and plan tomorrow', durationMinutes: 15 },
];

export function getStarterTasks(procrastinationType: string | null): StarterTask[] {
  if (procrastinationType && STARTER_TASKS_BY_TYPE[procrastinationType]) {
    return STARTER_TASKS_BY_TYPE[procrastinationType];
  }
  return DEFAULT_STARTER_TASKS;
}
