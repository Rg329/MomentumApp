// Run this SQL once in your Supabase SQL editor before deploying:
//
//   create table if not exists generation_logs (
//     id         bigint generated always as identity primary key,
//     user_id    uuid not null references auth.users(id) on delete cascade,
//     created_at timestamptz not null default now()
//   );
//   create index on generation_logs (user_id, created_at);
//   alter table generation_logs enable row level security;
//   -- Service role can read/write; users cannot access this table directly.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hard ceiling per user per calendar day (server-side guard against abuse).
// Free clients enforce 3/day; server allows headroom for premium regenerations.
// while blocking anyone trying to hammer the endpoint programmatically.
const DAILY_SERVER_LIMIT = 10;

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const PROCRASTINATION_CONTEXT: Record<string, string> = {
  overwhelmed_tasks:   'feels overwhelmed by large tasks — break them into small, completable chunks (max 30 min each)',
  waiting_motivation:  'waits for motivation before starting — schedule a quick 10-min win as the very first task to build momentum',
  dont_know_start:     'struggles to know where to begin — define an explicit first step for each task in the description',
  easily_distracted:   'gets distracted easily — use strict 25-min focused blocks followed by mandatory 5-min breaks',
  changing_plans:      'frequently changes plans mid-day — lock in one anchor task that cannot move',
  underestimate_time:  'consistently underestimates duration — add a 25% time buffer to every task',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── JWT verification ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────────
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count, error: countError } = await supabase
    .from('generation_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString());

  if (!countError && (count ?? 0) >= DAILY_SERVER_LIMIT) {
    return new Response(JSON.stringify({ error: 'Daily limit reached' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Log before generating so aborted requests still count
  await supabase.from('generation_logs').insert({ user_id: user.id });

  // ── Schedule generation ───────────────────────────────────────────────────────
  try {
    const {
      tasks,
      procrastinationType,
      peakTime,
      wakeTime,
      sleepTime,
      constraints,
      deadlines,
      behavioralContext,
      scheduleHints,
      proOptimization,
      proOptimizationRules,
    } = await req.json();

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

    const wakeStr  = minutesToTime(wakeTime ?? 390);
    const sleepStr = minutesToTime(sleepTime ?? 1365);

    const procrastinationRule = PROCRASTINATION_CONTEXT[procrastinationType] ??
      'struggles with procrastination — mix easy and hard tasks throughout the day';

    const constraintsText = (constraints ?? []).length > 0
      ? (constraints as any[]).map((c: any) => `  - ${c.title}: ${c.start}–${c.end}`).join('\n')
      : '  None';

    const deadlinesText = (deadlines ?? []).length > 0
      ? (deadlines as any[]).map((d: any) => `  - "${d.title}" due ${d.deadline}`).join('\n')
      : '  None';

    const tasksText = (tasks as any[])
      .map((t: any, i: number) => `  ${i + 1}. "${t.text}" — ${t.durationMinutes} min`)
      .join('\n');

    const behaviorText = behavioralContext
      ? [
          `Primary behavioral signal: ${behavioralContext.primarySignal ?? 'none'}`,
          behavioralContext.bestFocusPeriod
            ? `Observed best focus: ${behavioralContext.bestFocusPeriod}`
            : null,
          behavioralContext.metrics
            ? `Completion rate: ${Math.round((behavioralContext.metrics.completionRate ?? 0) * 100)}% · Completed: ${behavioralContext.metrics.tasksCompleted ?? 0} · Skipped: ${behavioralContext.metrics.tasksSkipped ?? 0} · Rescheduled: ${behavioralContext.metrics.tasksRescheduled ?? 0}`
            : null,
          (behavioralContext.patterns ?? []).length
            ? `Detected patterns:\n${(behavioralContext.patterns as any[]).map((p: any) => `  - ${p.label}: ${p.description}`).join('\n')}`
            : null,
          (behavioralContext.coachingDirectives ?? []).length
            ? `Coaching directives:\n${(behavioralContext.coachingDirectives as string[]).map((d) => `  - ${d}`).join('\n')}`
            : null,
        ].filter(Boolean).join('\n')
      : '  Not enough behavioral data yet — rely on onboarding profile.';

    const hintsText = scheduleHints
      ? [
          `Max visible tasks: ${scheduleHints.maxVisibleTasks ?? 'default'}`,
          `Chunk threshold: ${scheduleHints.chunkThresholdMinutes ?? 'default'} min`,
          `Break large tasks: ${scheduleHints.breakLargeTasks ? 'yes' : 'no'}`,
          `Energy pattern: ${scheduleHints.energyPattern ?? 'balanced'}`,
          scheduleHints.bufferMultiplier ? `Time buffer multiplier: ${scheduleHints.bufferMultiplier}` : null,
          scheduleHints.scheduleRationale ? `Rationale: ${scheduleHints.scheduleRationale}` : null,
        ].filter(Boolean).join('\n')
      : '  Use default scheduling heuristics.';

    const proRulesText = proOptimization && Array.isArray(proOptimizationRules) && proOptimizationRules.length
      ? (proOptimizationRules as string[]).map((r) => `  - ${r}`).join('\n')
      : null;

    const prompt = `You are Momentum, a productivity coach building a personalised daily schedule.

USER PROFILE:
- Procrastination pattern: ${procrastinationType ?? 'general'} — this user ${procrastinationRule}
- Peak energy time: ${peakTime ?? 'morning'}
- Day starts: ${wakeStr}
- Day ends: ${sleepStr}
${proOptimization ? '\nPRO SUBSCRIBER — apply behavioral replanning (this is a paid feature). Follow PRO RULES below strictly.\n' : ''}
BEHAVIORAL INTELLIGENCE (from real task events — prioritize over generic advice):
${behaviorText}

SCHEDULE ADJUSTMENTS (apply these constraints):
${hintsText}
${proRulesText ? `\nPRO BEHAVIORAL REPLANNING RULES (must follow):\n${proRulesText}\n` : ''}
TASKS TO SCHEDULE:
${tasksText}

BLOCKED SLOTS (never schedule tasks here):
${constraintsText}

UPCOMING DEADLINES:
${deadlinesText}

SCHEDULING RULES:
1. Place the hardest/most important task during peak energy (${peakTime ?? 'morning'}).
2. Apply the procrastination rule above — this is the most important thing you do.
3. Add a 10-min break after every 45–90 min of work.
4. Add a 30-min "Lunch & Rest" block near 12:30 if it fits in the day.
5. Never place tasks during blocked slots.
6. Include EVERY fixed commitment from BLOCKED TIME SLOTS as a "meeting" block at its exact start time and duration.
7. Include EVERY deadline from UPCOMING DEADLINES as an "insight" block at the deadline time (title = task name).
8. Tasks with upcoming deadlines get a "Due Soon" tag and higher priority.
9. Write each description as direct coaching advice in second person ("You'll...","Start by...","Your energy...").
10. Keep descriptions under 12 words — punchy, not verbose.

OUTPUT: Respond ONLY with raw JSON (no markdown fences, no explanation). Use this exact schema:
{
  "blocks": [
    {
      "id": "1",
      "time": "HH:MM",
      "type": "deep_work",
      "label": "Deep Work",
      "title": "task name",
      "description": "short coaching line",
      "duration": "45 min",
      "tag": "Priority",
      "tagType": "primary"
    }
  ]
}

type must be one of: deep_work | productivity | break | meeting | insight
tagType must be one of: primary | secondary | tertiary (or omit tag/tagType entirely for plain blocks)
id must be a unique string number ("1", "2", etc.)
time must be "HH:MM" 24-hour format`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';

    // Strip accidental markdown fences if model adds them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed  = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-schedule error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
