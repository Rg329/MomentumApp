import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { trackTaskCreated, trackTaskRescheduled } from '../intelligence/eventTracker';
import { ScheduleBlock } from '../data/mockData';
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
  onboardingData:      OnboardingData;
  account:             AccountProfile;
  tasks:               Task[];
  scheduleBlocks:      ScheduleBlock[];
  scheduleDate:        string | null;
  completedTaskIds:    string[]; // block IDs marked complete today
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
  lastAuthPromptDate:  string | null;

  // ── Actions ─────────────────────────────────────────────────────────────────
  setHasOnboarded:     (v: boolean) => void;
  dismissWelcomeCard:  () => void;
  setOnboardingData:   (data: Partial<OnboardingData>) => void;
  setAccount:          (data: Partial<AccountProfile>) => void;
  addTask:             (text: string, durationMinutes: number) => void;
  updateTask:          (id: string, text: string, durationMinutes: number) => void;
  removeTask:          (id: string) => void;
  clearTasks:          () => void;
  generateScheduleFromUserTasks: () => Promise<ScheduleBlock[]>;
  rescheduleScheduleBlock: (id: string, newTime: string) => void;
  markTaskComplete:    (blockId: string) => void;
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
  setLastAuthPromptDate: (date: string) => void;
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
      hasOnboarded:       false,
      hasSeenWelcomeCard: false,
      onboardingData:     { procrastinationType: null, peakTime: null, coaching: null },
      account:            { name: null, email: null, createdAt: null },
      tasks:              [],
      scheduleBlocks:     [],
      scheduleDate:       null,
      completedTaskIds:   [],
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
      lastAuthPromptDate: null,

      setHasOnboarded:    (v) => set({ hasOnboarded: v }),
      dismissWelcomeCard: ()  => set({ hasSeenWelcomeCard: true }),
      setOnboardingData:  (data) =>
        set((s) => ({ onboardingData: { ...s.onboardingData, ...data } })),
      setAccount: (data) => set((s) => ({ account: { ...s.account, ...data } })),
      addTask: (text, durationMinutes) => {
        const task = { id: Date.now().toString(), text: text.trim(), durationMinutes };
        set((s) => ({ tasks: [...s.tasks, task] }));
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
      clearTasks: () => set({ tasks: [], scheduleBlocks: [], completedTaskIds: [] }),
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
        }));
        useAppStore.getState().recordDayComplete();
      },
      clearDayData: () =>
        set({ scheduleBlocks: [], completedTaskIds: [], scheduleDate: null }),
      setWakeTime: (v) => set({ wakeTime: v }),
      setSleepTime:(v) => set({ sleepTime: v }),
      setPreferences: (data) =>
        set((s) => ({ preferences: { ...s.preferences, ...data } })),
      setConstraints: (constraints) => set({ constraints }),
      setDeadlines:   (deadlines)   => set({ deadlines }),
      setPremium: (v) =>
        set((s) => ({
          isPremium: v,
          trial: v && s.trial.isTrialActive
            ? { ...s.trial, isTrialActive: false }
            : s.trial,
        })),
      syncPremiumFromRevenueCat: (isPremium, isTrialActive, trialEndsAt) =>
        set((s) => {
          if (isPremium) {
            return {
              isPremium: true,
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
        set({ lastDailyReviewDate: today });
      },
      setLastAuthPromptDate: (date) => set({ lastAuthPromptDate: date }),
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
          set({ scheduleBlocks: [], completedTaskIds: [], scheduleDate: null });
        }
      },
      resetStore: () => set({
        hasOnboarded:        false,
        hasSeenWelcomeCard:  false,
        onboardingData:      { procrastinationType: null, peakTime: null, coaching: null },
        account:             { name: null, email: null, createdAt: null },
        tasks:               [],
        scheduleBlocks:      [],
        scheduleDate:        null,
        completedTaskIds:    [],
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
        lastAuthPromptDate:  null,
      }),
    }),
    {
      name: 'momentum-app-store',
      storage,
      partialize: (state) => ({
        hasOnboarded:        state.hasOnboarded,
        hasSeenWelcomeCard:  state.hasSeenWelcomeCard,
        onboardingData:      state.onboardingData,
        account:             state.account,
        tasks:               state.tasks,
        scheduleBlocks:      state.scheduleBlocks,
        scheduleDate:        state.scheduleDate,
        completedTaskIds:    state.completedTaskIds,
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
        lastAuthPromptDate:  state.lastAuthPromptDate,
      }),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          useAppStore.getState().expireTrialIfNeeded();
        });
      },
    }
  )
);
