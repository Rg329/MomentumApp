import type { FeatureDef, FeatureId, PricingPlan } from './types';

export const FREE_GENERATION_LIMIT = 3;

// Premium accent color — distinct from app's primary blue
export const PREMIUM_COLOR = '#6366f1'; // indigo-500

export const FEATURES: Record<FeatureId, FeatureDef> = {
  basic_coaching: {
    id:          'basic_coaching',
    name:        'Basic AI Coach',
    description: 'Daily summaries and focus coaching grounded in your tasks and logged activity.',
    promptHook:  'Your basic coach uses real task and completion data — not generic motivation.',
    plan:        'free',
    icon:        'account-voice',
  },
  schedule_regeneration: {
    id:          'schedule_regeneration',
    name:        'Schedule Regeneration',
    description: 'Regenerate your daily schedule as many times as needed.',
    promptHook:  "You've used your 3 free regenerations today.",
    plan:        'free',
    dailyLimit:  FREE_GENERATION_LIMIT,
    icon:        'refresh',
  },
  advanced_optimization: {
    id:          'advanced_optimization',
    name:        'Advanced Optimization',
    description: 'AI arranges tasks using your real completion patterns — peak focus, block size, and follow-through.',
    promptHook:  'Behavioral replanning adapts each schedule to how you actually work.',
    plan:        'premium',
    icon:        'lightning-bolt',
  },
  adaptive_coaching: {
    id:          'adaptive_coaching',
    name:        'Behavioral Intelligence Coach',
    description: 'Full procrastination analysis, pattern detection, and personalized recommendations from your usage history.',
    promptHook:  'Unlock advanced pattern analysis and accountability coaching from your real behavior data.',
    plan:        'premium',
    icon:        'brain',
  },
  deep_insights: {
    id:          'deep_insights',
    name:        'Deep Procrastination Analysis',
    description: 'Multi-pattern behavioral analysis with evidence from your task event history.',
    promptHook:  'See which procrastination patterns your data confirms — not generic advice.',
    plan:        'premium',
    icon:        'chart-areaspline',
  },
  weekly_reflections: {
    id:          'weekly_reflections',
    name:        'Weekly Coaching Reports',
    description: 'Observation → pattern → action weekly report from your 7-day completion trends.',
    promptHook:  'Weekly reports analyze your real completion data and recommend one change.',
    plan:        'premium',
    icon:        'text-box-check-outline',
  },
  unlimited_rescheduling: {
    id:          'unlimited_rescheduling',
    name:        'Unlimited Rescheduling',
    description: 'Move, defer, or split tasks at any time without restrictions.',
    promptHook:  'Premium users can reschedule any task, any time.',
    plan:        'premium',
    icon:        'calendar-refresh',
  },
  advanced_analytics: {
    id:          'advanced_analytics',
    name:        'Advanced Schedule Analytics',
    description: 'Track completion rates, streaks, momentum scores, and energy patterns over weeks.',
    promptHook:  'Advanced Analytics surfaces insights no basic app can match.',
    plan:        'premium',
    icon:        'poll',
  },
};

export const PREMIUM_FEATURES = Object.values(FEATURES).filter((f) => f.plan === 'premium');

export const PRICING: PricingPlan[] = [
  { id: 'monthly',  label: 'Monthly',  price: '$4.99',  period: 'per month' },
  { id: 'annual',   label: 'Annual',   price: '$29.99', period: 'per year',  badge: 'Best Value', savings: 'Save 50%' },
  { id: 'lifetime', label: 'Lifetime', price: '$79.99', period: 'one-time',  badge: 'Pay Once' },
];
