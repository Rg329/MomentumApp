/** Five starter tasks for the first-run demo — keyed by onboarding procrastination type. */
export type StarterTask = { text: string; durationMinutes: number };

export const STARTER_TASKS_BY_TYPE: Record<string, StarterTask[]> = {
  overwhelmed_tasks: [
    { text: 'Deep work: one priority project block', durationMinutes: 50 },
    { text: 'Reply to important messages', durationMinutes: 25 },
    { text: 'Review calendar and deadlines', durationMinutes: 20 },
    { text: 'Admin: forms, expenses, or paperwork', durationMinutes: 30 },
    { text: 'Prep materials for tomorrow', durationMinutes: 25 },
  ],
  waiting_motivation: [
    { text: 'Open the file and read for 15 minutes', durationMinutes: 25 },
    { text: 'Write the first real section', durationMinutes: 45 },
    { text: 'Do the easiest part first', durationMinutes: 30 },
    { text: 'Quick review of recent feedback', durationMinutes: 20 },
    { text: 'Set up workspace for the next session', durationMinutes: 20 },
  ],
  dont_know_start: [
    { text: 'Write step 1 on paper', durationMinutes: 20 },
    { text: 'Gather materials you need', durationMinutes: 25 },
    { text: 'Sketch a quick outline', durationMinutes: 35 },
    { text: 'First draft or rough version', durationMinutes: 45 },
    { text: 'Review progress and note what is left', durationMinutes: 20 },
  ],
  easily_distracted: [
    { text: 'Phone-free focus block', durationMinutes: 45 },
    { text: 'Problem set or practice questions', durationMinutes: 45 },
    { text: 'Reading assignment with notes', durationMinutes: 35 },
    { text: 'Single-task email cleanup', durationMinutes: 25 },
    { text: 'Review notes from last session', durationMinutes: 30 },
  ],
  changing_plans: [
    { text: 'Lock in top priority for today', durationMinutes: 20 },
    { text: 'Finish one thing before switching', durationMinutes: 45 },
    { text: 'Write a short plan for the rest of today', durationMinutes: 15 },
    { text: 'Deep work on secondary priority', durationMinutes: 40 },
    { text: 'End-of-day progress check-in', durationMinutes: 25 },
  ],
  underestimate_time: [
    { text: 'Main assignment with a hard stop timer', durationMinutes: 50 },
    { text: 'Break one project into concrete steps', durationMinutes: 30 },
    { text: 'Track time on a second priority task', durationMinutes: 55 },
    { text: 'Buffer block for overruns', durationMinutes: 25 },
    { text: 'Review what took longer than expected', durationMinutes: 20 },
  ],
};

export const DEFAULT_STARTER_TASKS: StarterTask[] = [
  { text: 'Deep work on top priority', durationMinutes: 50 },
  { text: 'Secondary project block', durationMinutes: 40 },
  { text: 'Admin and quick replies', durationMinutes: 25 },
  { text: 'Reading or learning block', durationMinutes: 35 },
  { text: 'Review and plan tomorrow', durationMinutes: 25 },
];

export function getStarterTasks(procrastinationType: string | null): StarterTask[] {
  if (procrastinationType && STARTER_TASKS_BY_TYPE[procrastinationType]) {
    return STARTER_TASKS_BY_TYPE[procrastinationType];
  }
  return DEFAULT_STARTER_TASKS;
}

export function starterTasksTotalMinutes(tasks: StarterTask[]): number {
  return tasks.reduce((sum, task) => sum + task.durationMinutes, 0);
}
