import type { CoachStyle } from './types';

/** Light tone pass — facts stay the same; no jargon added. */
export function applyCoachTone(
  style: CoachStyle | null,
  section: 'observation' | 'pattern' | 'action',
  text: string,
): string {
  if (!text) return text;
  const coach = style ?? 'balanced';

  if (section === 'action') {
    if (coach === 'supportive') {
      return text.replace(/^Tomorrow,/, 'When you\'re ready tomorrow,')
        .replace(/^Next week,/, 'Next week, try to');
    }
    if (coach === 'strict') {
      return text.replace(/^Tomorrow,/, 'Tomorrow — no excuses:')
        .replace(/^Pick one/, 'Pick one');
    }
  }

  return text;
}

export function actionPrefix(_style: CoachStyle | null): string {
  return 'Your next step';
}
