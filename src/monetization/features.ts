import type { FeatureDef, FeatureId, PricingPlan } from './types';

export const FREE_GENERATION_LIMIT = 3;

// Premium accent color — distinct from app's primary blue
export const PREMIUM_COLOR = '#6366f1'; // indigo-500

export const FEATURES: Record<FeatureId, FeatureDef> = {
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
    description: 'AI arranges tasks for maximum flow — matching energy, difficulty, and resistance patterns.',
    promptHook:  'Advanced Optimization builds schedules that feel effortless.',
    plan:        'premium',
    icon:        'lightning-bolt',
  },
  adaptive_coaching: {
    id:          'adaptive_coaching',
    name:        'Adaptive Coaching',
    description: 'Your coach evolves week-over-week based on what actually works for you.',
    promptHook:  'Adaptive Coaching learns your patterns and adjusts automatically.',
    plan:        'premium',
    icon:        'brain',
  },
  deep_insights: {
    id:          'deep_insights',
    name:        'Deep Productivity Insights',
    description: 'Understand your focus patterns, peak hours, and task-completion trends over time.',
    promptHook:  'Deep Insights reveal exactly when and why you\'re most productive.',
    plan:        'premium',
    icon:        'chart-areaspline',
  },
  weekly_reflections: {
    id:          'weekly_reflections',
    name:        'Weekly AI Reflections',
    description: 'A personalised weekly review of your productivity patterns with actionable suggestions.',
    promptHook:  'Weekly Reflections give you a coach-written summary every Sunday.',
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
