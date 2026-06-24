import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

interface AppState {
  hasOnboarded:        boolean;
  hasSeenWelcomeCard:  boolean;
  onboardingData:      OnboardingData;
  account:             AccountProfile;
  tasks:               Task[];
  wakeTime:            number;
  sleepTime:           number;

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
  setWakeTime:         (v: number) => void;
  setSleepTime:        (v: number) => void;
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
      wakeTime:           390,
      sleepTime:          1365,
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
      addTask: (text, durationMinutes) =>
        set((s) => ({
          tasks: [...s.tasks, { id: Date.now().toString(), text: text.trim(), durationMinutes }],
        })),
      removeTask: (id) =>
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      clearTasks:  () => set({ tasks: [] }),
      setWakeTime: (v) => set({ wakeTime: v }),
      setSleepTime:(v) => set({ sleepTime: v }),
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
        wakeTime:           state.wakeTime,
        sleepTime:          state.sleepTime,
        isPremium:          state.isPremium,
        trial:              state.trial,
        dailyGenerations:   state.dailyGenerations,
        lastGenerationDate: state.lastGenerationDate,
        lastDailyReviewDate: state.lastDailyReviewDate,
      }),
    }
  )
);
