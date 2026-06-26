import { buildSurfaceCoaching } from './surfaceCopy';
import type {
  CoachingContext,
  CoachingMessage,
  CoachingOptions,
  CoachingSurface,
} from './types';

export function generateCoachingMessage(
  surface: CoachingSurface,
  ctx: CoachingContext,
  options?: CoachingOptions,
  isPremium = false,
): CoachingMessage {
  return buildSurfaceCoaching(surface, ctx, options, isPremium);
}

/** Compact single-line coaching for focus mode banners. */
export function generateFocusCoachingLine(
  surface: 'focus_start' | 'focus_midway' | 'focus_complete',
  ctx: CoachingContext,
  options: CoachingOptions,
  isPremium: boolean,
): string {
  const msg = generateCoachingMessage(surface, ctx, options, isPremium);
  if (surface === 'focus_midway') return msg.action;
  if (surface === 'focus_complete') return msg.action || msg.observation;
  return msg.action || msg.observation;
}
