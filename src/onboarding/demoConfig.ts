/** Minimum time on the sample schedule before the handoff sheet may appear. */
export const DEMO_HANDOFF_MIN_VIEW_MS = 60_000;

export function demoHandoffDelayRemaining(viewedAtIso: string | null, now = Date.now()): number {
  if (!viewedAtIso) return DEMO_HANDOFF_MIN_VIEW_MS;
  const elapsed = now - new Date(viewedAtIso).getTime();
  return Math.max(0, DEMO_HANDOFF_MIN_VIEW_MS - elapsed);
}
