import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { buildCoachingContext, computeDailyAnalytics } from '../coaching';

export type RetentionMetrics = {
  currentStreak: number;
  bestStreak: number;
  momentumScore: number;
  loading: boolean;
};

const DEFAULT: RetentionMetrics = {
  currentStreak: 0,
  bestStreak: 0,
  momentumScore: 0,
  loading: true,
};

/** Real streak + momentum from behavioral metrics (Phase E). */
export function useRetentionMetrics(): RetentionMetrics {
  const [metrics, setMetrics] = useState<RetentionMetrics>(DEFAULT);

  const refresh = useCallback(async () => {
    try {
      const ctx = await buildCoachingContext();
      const analytics = computeDailyAnalytics(ctx);
      setMetrics({
        currentStreak: analytics.currentStreak,
        bestStreak: analytics.bestStreak,
        momentumScore: analytics.momentumScore,
        loading: false,
      });
    } catch {
      setMetrics((m) => ({ ...m, loading: false }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return metrics;
}
