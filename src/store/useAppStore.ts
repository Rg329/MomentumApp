import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { trackTaskCreated, trackTaskRescheduled } from '../intelligence/eventTracker';
import { ScheduleBlock } from '../data/mockData';
import { buildAndSaveUserSchedule } from '../scheduling/scheduleService';

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
  wakeTime:            number;
  sleepTime:           number;
  preferences:         AppPreferences;

  // ── Monetization ────────────────────────────────────────────────────────────
  isPremium:           boolean;
  trial:              TrialState;
  dailyGenerations:    number;   // how many regenerations used today
  lastGenerationDate:  string | null; // ISO date string YYYY-MM-DD
  lastDailyReviewDate: string | null; // ISO date string YYYY-MM-DD

  // ── Actions ─────────────────────────────────────────────────────────────────
  setHasOnboarded:     (v: boolean) => void;
  dismissWelcomeCard:  () => void;
  setOnboardingData:   (data: Partial<OnboardingData>) => void;
  setAccount:          (data: Partial<AccountProfile>) => void;
  addTask:             (text: string, durationMinutes: number) => void;
  removeTask:          (id: string) => void;
  clearTasks:          () => void;
  generateScheduleFromUserTasks: () => ScheduleBlock[];
  rescheduleScheduleBlock: (id: string, newTime: string) => void;
  setWakeTime:         (v: number) => void;
  setSleepTime:        (v: number) => void;
  setPreferences:      (data: Partial<AppPreferences>) => void;
  setPremium:          (v: boolean) => void;
  startFreeTrial14d:   () => void;
  incrementGeneration: () => void;
  completeDailyReview: () => void;
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
      wakeTime:           390,
      sleepTime:          1365,
      preferences:        { ...DEFAULT_PREFERENCES },
      isPremium:          false,
      trial:              { isTrialActive: false, startedAt: null, endsAt: null },
      dailyGenerations:   0,
      lastGenerationDate: null,
      lastDailyReviewDate:null,

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
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      clearTasks:  () => set({ tasks: [], scheduleBlocks: [] }),
      generateScheduleFromUserTasks: () => buildAndSaveUserSchedule(),
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
      setWakeTime: (v) => set({ wakeTime: v }),
      setSleepTime:(v) => set({ sleepTime: v }),
      setPreferences: (data) =>
        set((s) => ({ preferences: { ...s.preferences, ...data } })),
      setPremium:  (v) => set({ isPremium: v }),
      startFreeTrial14d: () => {
        const startedAt = new Date();
        const endsAt = new Date(startedAt);
        endsAt.setDate(endsAt.getDate() + 14);
        set({
          isPremium: true,
          trial: {
            isTrialActive: true,
            startedAt: startedAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        });
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
    }),
    {
      name: 'momentum-app-store',
      storage,
      partialize: (state) => ({
        hasOnboarded:       state.hasOnboarded,
        hasSeenWelcomeCard: state.hasSeenWelcomeCard,
        onboardingData:     state.onboardingData,
        account:            state.account,
        tasks:              state.tasks,
        scheduleBlocks:     state.scheduleBlocks,
        wakeTime:           state.wakeTime,
        sleepTime:          state.sleepTime,
        preferences:        state.preferences,
        isPremium:          state.isPremium,
        trial:              state.trial,
        dailyGenerations:   state.dailyGenerations,
        lastGenerationDate: state.lastGenerationDate,
        lastDailyReviewDate: state.lastDailyReviewDate,
      }),
    }
  )
);
