import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { trackTaskCreated, trackTaskRescheduled } from '../intelligence/eventTracker';
import { ScheduleBlock } from '../types/schedule';
import { buildAndSaveUserSchedule } from '../scheduling/scheduleService';
import { isTrialExpired } from '../monetization/trial';

interface OnboardingData {
  procrastinationType: string | null;
  peakTime:            string | null;
  coaching:            string | null;
}

interface TrialState {
  isTrialActive: boolean;
  startedAt: string | null; // ISO string
  endsAt: string | null;    // ISO string
}

export type { TrialState };

interface AccountProfile {
  name: string | null;
  email: string | null;
  createdAt: string | null; // ISO string
}

export interface Task {
  id: string;
  text: string;
  durationMinutes: number;
  /** Sample tasks from the first-run demo flow. */
  isDemo?: boolean;
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

export type NotificationStyle = 'gentle' | 'standard' | 'minimal';
export type Weekday =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export interface AppPreferences {
  defaultFocusDurationMinutes: number;
  breakDurationMinutes: number;
  notificationStyle: NotificationStyle;
  weeklyReflectionDay: Weekday;
  advancedOptimizationEnabled: boolean;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  defaultFocusDurationMinutes: 25,
  breakDurationMinutes: 15,
  notificationStyle: 'standard',
  weeklyReflectionDay: 'sunday',
  advancedOptimizationEnabled: false,
};

interface AppState {
  hasOnboarded:        boolean;
  hasSeenWelcomeCard:  boolean;
  /** User confirmed wake/sleep before first schedule generation. */
  hasConfirmedDayWindow: boolean;
  /** User picked or skipped the post-win coaching style prompt. */
  hasChosenCoachingStyle: boolean;
  /** User saw or dismissed the post-win save prompt (Phase 5). */
  hasSeenSavePrompt: boolean;
  /** User saw or answered the end-of-session tomorrow hook (Phase 6). */
  hasSeenTomorrowHook: boolean;
  /** User opted into a daily reminder at wake time. */
  tomorrowReminderEnabled: boolean;
  onboardingData:      OnboardingData;
  account:             AccountProfile;
  tasks:               Task[];
  scheduleBlocks:      ScheduleBlock[];
  scheduleDate:        string | null;
  /** Task IDs included in the last generated schedule (for "new task" nudges). */
  lastScheduledTaskIds: string[];
  /** Dev: how the current schedule was built (not persisted). */
  lastScheduleSource: 'claude' | 'local' | null;
  lastScheduleSourceDetail: string | null;
  /** Shown on Schedule when Pro behavioral optimization ran. */
  lastProOptimizationSummary: string | null;
  lastProOptimizationRules: string[];
  completedTaskIds:    string[]; // block IDs marked complete today
  skippedTaskIds:      string[]; // block IDs skipped today (with reason logged)
  wakeTime:            number;
  sleepTime:           number;
  preferences:         AppPreferences;
  constraints:         Constraint[];
  deadlines:           DeadlineTask[];

  // ── Streak ──────────────────────────────────────────────────────────────────
  currentStreak:       number;
  longestStreak:       number;
  lastStreakDate:       string | null; // ISO date of last day tasks were completed

  // ── Monetization ────────────────────────────────────────────────────────────
  isPremium:           boolean;
  hasSeenProOffer:     boolean;
  trial:               TrialState;
  dailyGenerations:    number;
  lastGenerationDate:  string | null;
  lastDailyReviewDate: string | null;
  lastEndOfDayPromptDate: string | null;
  lastAuthPromptDate:  string | null;

  /** First Focus visit path: none = not chosen yet. */
  firstRunPath:        'none' | 'demo' | 'own';
  hasSeenDemoHandoff:  boolean;
  hasSeenAppTour:      boolean;
  /** When the user first opened today's demo schedule (for handoff timing). */
  demoScheduleViewedAt: string | null;

  // ── Actions ─────────────────────────────────────────────────────────────────
  setHasOnboarded:     (v: boolean) => void;
  dismissWelcomeCard:  () => void;
  confirmDayWindow:    () => void;
  chooseCoachingStyle: (style: string) => void;
  skipCoachingStylePicker: () => void;
  dismissSavePrompt: () => void;
  acceptTomorrowReminder: () => void;
  declineTomorrowReminder: () => void;
  setOnboardingData:   (data: Partial<OnboardingData>) => void;
  setAccount:          (data: Partial<AccountProfile>) => void;
  addTask:             (text: string, durationMinutes: number, isDemo?: boolean) => void;
  updateTask:          (id: string, text: string, durationMinutes: number) => void;
  removeTask:          (id: string) => void;
  clearTasks:          () => void;
  generateScheduleFromUserTasks: () => Promise<ScheduleBlock[]>;
  rescheduleScheduleBlock: (id: string, newTime: string) => void;
  markTaskComplete:    (blockId: string) => void;
  markTaskSkipped:     (blockId: string) => void;
  clearDayData:        () => void;
  setWakeTime:         (v: number) => void;
  setSleepTime:        (v: number) => void;
  setPreferences:      (data: Partial<AppPreferences>) => void;
  setConstraints:      (constraints: Constraint[]) => void;
  setDeadlines:        (deadlines: DeadlineTask[]) => void;
  setPremium:          (v: boolean) => void;
  syncPremiumFromRevenueCat: (isPremium: boolean, isTrialActive: boolean, trialEndsAt: string | null) => void;
  setHasSeenProOffer:  (v: boolean) => void;
  setScheduleDate:     (date: string | null) => void;
  startFreeTrial14d:   () => void;
  expireTrialIfNeeded: () => boolean;
  incrementGeneration: () => void;
  completeDailyReview: () => void;
  dismissEndOfDayReview: () => void;
  setLastAuthPromptDate: (date: string) => void;
  setFirstRunPath:       (path: 'demo' | 'own') => void;
  addDemoStarterTasks:   (tasks: Array<{ text: string; durationMinutes: number }>) => void;
  clearDemoPlanAndTasks: () => void;
  dismissDemoHandoff:    () => void;
  markDemoScheduleViewed: () => void;
  markAppTourSeen:       () => void;
  recordDayComplete:   () => void; // call when user completes ≥1 task on a given day
  clearStaleSchedule:  () => void; // wipe schedule blocks if generated on a previous day
  resetStore:          () => void;
}

const storage = Platform.OS === 'web'
  ? createJSONStorage(() => localStorage)
  : createJSONStorage(() => AsyncStorage);

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasOnboarded:           false,
      hasSeenWelcomeCard:     false,
      hasConfirmedDayWindow:  false,
      hasChosenCoachingStyle: false,
      hasSeenSavePrompt:        false,
      hasSeenTomorrowHook:      false,
      tomorrowReminderEnabled:  false,
      onboardingData:         { procrastinationType: null, peakTime: null, coaching: null },
      account:            { name: null, email: null, createdAt: null },
      tasks:              [],
      scheduleBlocks:     [],
      scheduleDate:       null,
      lastScheduledTaskIds: [],
      lastScheduleSource: null,
      lastScheduleSourceDetail: null,
      lastProOptimizationSummary: null,
      lastProOptimizationRules: [],
      completedTaskIds:   [],
      skippedTaskIds:     [],
      wakeTime:           390,
      sleepTime:          1365,
      preferences:        { ...DEFAULT_PREFERENCES },
      constraints:        [],
      deadlines:          [],
      currentStreak:      0,
      longestStreak:      0,
      lastStreakDate:      null,
      isPremium:          false,
      hasSeenProOffer:    false,
      trial:              { isTrialActive: false, startedAt: null, endsAt: null },
      dailyGenerations:   0,
      lastGenerationDate: null,
      lastDailyReviewDate:null,
      lastEndOfDayPromptDate: null,
      lastAuthPromptDate: null,
      firstRunPath: 'none',
      hasSeenDemoHandoff: false,
      hasSeenAppTour: false,
      demoScheduleViewedAt: null,

      setHasOnboarded:    (v) => set({ hasOnboarded: v }),
      dismissWelcomeCard: ()  => set({ hasSeenWelcomeCard: true }),
      confirmDayWindow:   ()  => set({ hasConfirmedDayWindow: true }),
      chooseCoachingStyle: (style) =>
        set((s) => ({
          hasChosenCoachingStyle: true,
          onboardingData: { ...s.onboardingData, coaching: style },
        })),
      skipCoachingStylePicker: () =>
        set((s) => ({
          hasChosenCoachingStyle: true,
          onboardingData: {
            ...s.onboardingData,
            coaching: s.onboardingData.coaching ?? 'balanced',
          },
        })),
      dismissSavePrompt: () => set({ hasSeenSavePrompt: true }),
      acceptTomorrowReminder: () =>
        set({ hasSeenTomorrowHook: true, tomorrowReminderEnabled: true }),
      declineTomorrowReminder: () =>
        set({ hasSeenTomorrowHook: true, tomorrowReminderEnabled: false }),
      setOnboardingData:  (data) =>
        set((s) => ({ onboardingData: { ...s.onboardingData, ...data } })),
      setAccount: (data) => set((s) => ({ account: { ...s.account, ...data } })),
      addTask: (text, durationMinutes, isDemo = false) => {
        const task: Task = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          text: text.trim(),
          durationMinutes,
          ...(isDemo ? { isDemo: true } : {}),
        };
        set((s) => ({
          tasks: [...s.tasks, task],
          firstRunPath: s.firstRunPath === 'none' && !isDemo ? 'own' : s.firstRunPath,
        }));
        trackTaskCreated(task);
      },
      updateTask: (id, text, durationMinutes) => {
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, text: text.trim(), durationMinutes } : t,
          ),
        }));
      },
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      clearTasks: () => set({ tasks: [], scheduleBlocks: [], completedTaskIds: [], skippedTaskIds: [] }),
      generateScheduleFromUserTasks: async () => (await buildAndSaveUserSchedule()).blocks,
      rescheduleScheduleBlock: (id, newTime) => {
        const block = useAppStore.getState().scheduleBlocks.find((b) => b.id === id);
        if (!block || block.time === newTime) return;

        const previousTime = block.time;
        set((s) => ({
          scheduleBlocks: [...s.scheduleBlocks]
            .map((b) => (b.id === id ? { ...b, time: newTime } : b))
            .sort((a, b) => {
              const toMins = (t: string) => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
              };
              return toMins(a.time) - toMins(b.time);
            }),
        }));

        trackTaskRescheduled(id, block.title, previousTime, newTime);
      },
      markTaskComplete: (blockId) => {
        set((s) => ({
          completedTaskIds: s.completedTaskIds.includes(blockId)
            ? s.completedTaskIds
            : [...s.completedTaskIds, blockId],
          skippedTaskIds: s.skippedTaskIds.filter((id) => id !== blockId),
        }));
        useAppStore.getState().recordDayComplete();
      },
      markTaskSkipped: (blockId) => {
        set((s) => ({
          skippedTaskIds: s.skippedTaskIds.includes(blockId)
            ? s.skippedTaskIds
            : [...s.skippedTaskIds, blockId],
        }));
      },
      clearDayData: () =>
        set({
          scheduleBlocks: [],
          completedTaskIds: [],
          skippedTaskIds: [],
          scheduleDate: null,
          lastScheduledTaskIds: [],
          lastScheduleSource: null,
          lastScheduleSourceDetail: null,
          lastProOptimizationSummary: null,
          lastProOptimizationRules: [],
        }),
      setWakeTime: (v) => set({ wakeTime: v }),
      setSleepTime:(v) => set({ sleepTime: v }),
      setPreferences: (data) =>
        set((s) => ({ preferences: { ...s.preferences, ...data } })),
      setConstraints: (constraints) => set({ constraints }),
      setDeadlines:   (deadlines)   => set({ deadlines }),
      setPremium: (v) =>
        set((s) => ({
          isPremium: v,
          preferences: v
            ? { ...s.preferences, advancedOptimizationEnabled: true }
            : s.preferences,
          trial: v && s.trial.isTrialActive
            ? { ...s.trial, isTrialActive: false }
            : s.trial,
        })),
      syncPremiumFromRevenueCat: (isPremium, isTrialActive, trialEndsAt) =>
        set((s) => {
          if (isPremium) {
            return {
              isPremium: true,
              preferences: { ...s.preferences, advancedOptimizationEnabled: true },
              trial: {
                isTrialActive: isTrialActive,
                startedAt: s.trial.startedAt,
                endsAt: trialEndsAt,
              },
            };
          }

          const localTrialValid =
            s.trial.isTrialActive &&
            s.trial.endsAt &&
            !isTrialExpired(s.trial.endsAt);

          if (localTrialValid) {
            return { isPremium: true, trial: s.trial };
          }

          return {
            isPremium: false,
            trial: s.trial.isTrialActive
              ? { ...s.trial, isTrialActive: false }
              : s.trial,
          };
        }),
      setHasSeenProOffer: (v) => set({ hasSeenProOffer: v }),
      setScheduleDate: (date) => set({ scheduleDate: date }),
      startFreeTrial14d: () => {
        const startedAt = new Date();
        const endsAt = new Date(startedAt);
        endsAt.setDate(endsAt.getDate() + 14);
        set({
          isPremium: true,
          hasSeenProOffer: true,
          trial: {
            isTrialActive: true,
            startedAt: startedAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        });
      },
      expireTrialIfNeeded: () => {
        const { isPremium, trial } = useAppStore.getState();
        if (!isPremium || !trial.isTrialActive || !trial.endsAt) return false;
        if (!isTrialExpired(trial.endsAt)) return false;

        set({
          isPremium: false,
          trial: { ...trial, isTrialActive: false },
        });
        return true;
      },
      incrementGeneration: () => {
        const today = new Date().toISOString().split('T')[0];
        set((s) => ({
          dailyGenerations:   s.lastGenerationDate === today ? s.dailyGenerations + 1 : 1,
          lastGenerationDate: today,
        }));
      },
      completeDailyReview: () => {
        const today = new Date().toISOString().split('T')[0];
        set({ lastDailyReviewDate: today, lastEndOfDayPromptDate: today });
      },
      dismissEndOfDayReview: () => {
        const today = new Date().toISOString().split('T')[0];
        set({ lastEndOfDayPromptDate: today });
      },
      setLastAuthPromptDate: (date) => set({ lastAuthPromptDate: date }),
      setFirstRunPath: (path) => set({ firstRunPath: path }),
      addDemoStarterTasks: (starterTasks) => {
        const demoTasks: Task[] = starterTasks.map((t, index) => ({
          id: `demo-${Date.now()}-${index}`,
          text: t.text,
          durationMinutes: t.durationMinutes,
          isDemo: true,
        }));
        set((s) => ({
          firstRunPath: 'demo',
          demoScheduleViewedAt: null,
          tasks: [
            ...s.tasks.filter((t) => !t.isDemo),
            ...demoTasks.filter(
              (dt) => !s.tasks.some((existing) => existing.text.toLowerCase() === dt.text.toLowerCase()),
            ),
          ],
        }));
        demoTasks.forEach((task) => trackTaskCreated(task));
      },
      clearDemoPlanAndTasks: () =>
        set((s) => ({
          tasks: s.tasks.filter((t) => !t.isDemo),
          scheduleBlocks: [],
          scheduleDate: null,
          lastScheduledTaskIds: [],
          completedTaskIds: [],
          skippedTaskIds: [],
          lastScheduleSource: null,
          lastScheduleSourceDetail: null,
          lastProOptimizationSummary: null,
          lastProOptimizationRules: [],
          hasSeenDemoHandoff: true,
          firstRunPath: 'own',
          demoScheduleViewedAt: null,
        })),
      dismissDemoHandoff: () => set({ hasSeenDemoHandoff: true }),
      markDemoScheduleViewed: () =>
        set((s) => {
          if (s.demoScheduleViewedAt) return s;
          return { demoScheduleViewedAt: new Date().toISOString() };
        }),
      markAppTourSeen: () => set({ hasSeenAppTour: true }),
      recordDayComplete: () => {
        const today = new Date().toISOString().split('T')[0];
        const s = useAppStore.getState();
        if (s.lastStreakDate === today) return; // already recorded today
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const newStreak = s.lastStreakDate === yesterday ? s.currentStreak + 1 : 1;
        const longest = Math.max(newStreak, s.longestStreak);
        set({ currentStreak: newStreak, longestStreak: longest, lastStreakDate: today });
      },
      clearStaleSchedule: () => {
        const today = new Date().toISOString().split('T')[0];
        const { scheduleDate } = useAppStore.getState();
        if (scheduleDate && scheduleDate !== today) {
          set({
            scheduleBlocks: [],
            completedTaskIds: [],
            skippedTaskIds: [],
            scheduleDate: null,
            lastScheduledTaskIds: [],
            lastScheduleSource: null,
            lastScheduleSourceDetail: null,
            lastProOptimizationSummary: null,
            lastProOptimizationRules: [],
          });
        }
      },
      resetStore: () => set({
        hasOnboarded:           false,
        hasSeenWelcomeCard:     false,
        hasConfirmedDayWindow:  false,
        hasChosenCoachingStyle: false,
        hasSeenSavePrompt:        false,
        hasSeenTomorrowHook:      false,
        tomorrowReminderEnabled:  false,
        onboardingData:         { procrastinationType: null, peakTime: null, coaching: null },
        account:             { name: null, email: null, createdAt: null },
        tasks:               [],
        scheduleBlocks:      [],
        scheduleDate:        null,
        lastScheduledTaskIds: [],
        lastScheduleSource: null,
        lastScheduleSourceDetail: null,
        lastProOptimizationSummary: null,
        lastProOptimizationRules: [],
        completedTaskIds:    [],
        skippedTaskIds:      [],
        wakeTime:            390,
        sleepTime:           1365,
        preferences:         { ...DEFAULT_PREFERENCES },
        constraints:         [],
        deadlines:           [],
        currentStreak:       0,
        longestStreak:       0,
        lastStreakDate:       null,
        isPremium:           false,
        hasSeenProOffer:     false,
        trial:               { isTrialActive: false, startedAt: null, endsAt: null },
        dailyGenerations:    0,
        lastGenerationDate:  null,
        lastDailyReviewDate: null,
        lastEndOfDayPromptDate: null,
        lastAuthPromptDate:  null,
        firstRunPath:        'none',
        hasSeenDemoHandoff:  false,
        hasSeenAppTour:      false,
        demoScheduleViewedAt: null,
      }),
    }),
    {
      name: 'momentum-app-store',
      storage,
      partialize: (state) => ({
        hasOnboarded:           state.hasOnboarded,
        hasSeenWelcomeCard:     state.hasSeenWelcomeCard,
        hasConfirmedDayWindow:  state.hasConfirmedDayWindow,
        hasChosenCoachingStyle: state.hasChosenCoachingStyle,
        hasSeenSavePrompt:        state.hasSeenSavePrompt,
        hasSeenTomorrowHook:      state.hasSeenTomorrowHook,
        tomorrowReminderEnabled:  state.tomorrowReminderEnabled,
        onboardingData:         state.onboardingData,
        account:             state.account,
        tasks:               state.tasks,
        scheduleBlocks:      state.scheduleBlocks,
        scheduleDate:        state.scheduleDate,
        lastScheduledTaskIds: state.lastScheduledTaskIds,
        lastProOptimizationSummary: state.lastProOptimizationSummary,
        lastProOptimizationRules: state.lastProOptimizationRules,
        completedTaskIds:    state.completedTaskIds,
        skippedTaskIds:      state.skippedTaskIds,
        wakeTime:            state.wakeTime,
        sleepTime:           state.sleepTime,
        preferences:         state.preferences,
        constraints:         state.constraints,
        deadlines:           state.deadlines,
        currentStreak:       state.currentStreak,
        longestStreak:       state.longestStreak,
        lastStreakDate:       state.lastStreakDate,
        isPremium:           state.isPremium,
        hasSeenProOffer:     state.hasSeenProOffer,
        trial:               state.trial,
        dailyGenerations:    state.dailyGenerations,
        lastGenerationDate:  state.lastGenerationDate,
        lastDailyReviewDate: state.lastDailyReviewDate,
        lastEndOfDayPromptDate: state.lastEndOfDayPromptDate,
        lastAuthPromptDate:  state.lastAuthPromptDate,
        firstRunPath:        state.firstRunPath,
        hasSeenDemoHandoff:  state.hasSeenDemoHandoff,
        hasSeenAppTour:      state.hasSeenAppTour,
        demoScheduleViewedAt: state.demoScheduleViewedAt,
      }),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          useAppStore.getState().expireTrialIfNeeded();
        });
      },
    }
  )
);
