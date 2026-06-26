import { useCallback, useEffect, useState } from 'react';
import { usePremium } from '../monetization';
import type { FeatureId } from '../monetization/types';
import { buildCoachingContext } from './contextBuilder';
import { generateCoachingMessage } from './engine';
import { computeDailyAnalytics, buildWeeklyReport } from './analytics';
import type {
  CoachingMessage,
  CoachingOptions,
  CoachingSurface,
  CoachingContext,
  DailyAnalytics,
  WeeklyCoachingReport,
} from './types';

const SURFACE_FEATURES: Partial<Record<CoachingSurface, FeatureId>> = {
  deep_analysis: 'deep_insights',
  weekly_report: 'weekly_reflections',
  pattern_analysis: 'adaptive_coaching',
  productivity_trends: 'advanced_analytics',
  focus_start: 'basic_coaching',
  focus_midway: 'basic_coaching',
  focus_complete: 'basic_coaching',
  daily_summary: 'basic_coaching',
  schedule_banner: 'basic_coaching',
};

export type BehavioralCoachState = {
  loading: boolean;
  context: CoachingContext | null;
  coaching: CoachingMessage | null;
  analytics: DailyAnalytics | null;
  weeklyReport: WeeklyCoachingReport | null;
  blocked: boolean;
  requiredFeature: FeatureId | null;
  refresh: () => Promise<void>;
};

export function useBehavioralCoach(
  surface: CoachingSurface,
  options?: CoachingOptions,
): BehavioralCoachState {
  const pm = usePremium();
  const requiredFeature = SURFACE_FEATURES[surface] ?? null;
  const blocked = requiredFeature ? !pm.canUse(requiredFeature) : false;

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<CoachingContext | null>(null);
  const [coaching, setCoaching] = useState<CoachingMessage | null>(null);
  const [analytics, setAnalytics] = useState<DailyAnalytics | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyCoachingReport | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const ctx = await buildCoachingContext();
      setContext(ctx);
      setAnalytics(computeDailyAnalytics(ctx));
      setWeeklyReport(buildWeeklyReport(ctx));

      if (!blocked) {
        setCoaching(generateCoachingMessage(surface, ctx, options, pm.isPremium));
      } else {
        setCoaching(null);
      }
    } catch (error) {
      console.warn('[Coaching] Failed to build coaching context:', error);
      setCoaching(null);
    } finally {
      setLoading(false);
    }
  }, [surface, blocked, pm.isPremium, options?.currentTaskTitle, options?.durationMinutes, options?.progressPct]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    context,
    coaching,
    analytics,
    weeklyReport,
    blocked,
    requiredFeature,
    refresh,
  };
}
