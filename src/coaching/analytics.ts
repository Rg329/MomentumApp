import type { CoachingContext } from './types';
import type { WeeklyCoachingReport } from './types';
import { buildSurfaceCoaching } from './surfaceCopy';
import { strongestWeekday, weekTotals } from './signals';

// Re-export analytics helpers from original file — score logic unchanged
export { computeDailyAnalytics } from './analyticsCore';

export function buildWeeklyReport(ctx: CoachingContext): WeeklyCoachingReport {
  const coaching = buildSurfaceCoaching('weekly_report', ctx);
  const { completed } = weekTotals(ctx);
  const strongest = strongestWeekday(ctx);

  const start = ctx.insights.completionTrends[0]?.date;
  const end = ctx.insights.completionTrends[ctx.insights.completionTrends.length - 1]?.date;
  const weekLabel = start && end
    ? `${new Date(start + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(end + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : 'Last 7 days';

  const { completed: c, skipped: s, denom } = weekTotals(ctx);
  const weekCompletionPct = denom > 0 ? Math.round((c / denom) * 100) : 0;

  return {
    weekLabel,
    observation: coaching.observation,
    pattern: coaching.pattern,
    action: coaching.action,
    weekCompletionPct,
    strongestDay: strongest?.day ?? null,
    totalCompleted: completed,
  };
}
