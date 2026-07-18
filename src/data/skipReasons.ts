export type SkipReasonKey =
  | 'distracted'
  | 'no_time'
  | 'low_energy'
  | 'priority_changed'
  | 'underestimated'
  | 'other';

export type SkipReasonOption = {
  key: SkipReasonKey;
  label: string;
  icon: string;
};

export const SKIP_REASONS: SkipReasonOption[] = [
  { key: 'distracted',         label: 'Got distracted',           icon: 'cellphone-off' },
  { key: 'no_time',            label: 'Ran out of time',          icon: 'clock-alert-outline' },
  { key: 'low_energy',         label: 'Low energy / not in mood', icon: 'battery-low' },
  { key: 'priority_changed',   label: 'Something else came up',   icon: 'swap-horizontal' },
  { key: 'underestimated',     label: 'Took longer than planned', icon: 'timer-sand' },
  { key: 'other',              label: 'Other',                    icon: 'dots-horizontal' },
];

export function skipReasonLabel(key: string): string {
  return SKIP_REASONS.find((r) => r.key === key)?.label ?? key;
}
