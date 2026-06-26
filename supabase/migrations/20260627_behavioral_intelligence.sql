-- Momentum Behavioral Intelligence Backend
-- Run in Supabase Dashboard → SQL Editor (or via Supabase CLI).

-- ─── 1. Task events (append-only behavioral log) ─────────────────────────────

create table if not exists public.task_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  task_id          text not null,
  event_type       text not null check (
    event_type in (
      'task_created',
      'task_started',
      'task_completed',
      'task_skipped',
      'task_rescheduled'
    )
  ),
  task_title       text,
  duration_minutes integer,
  metadata         jsonb not null default '{}'::jsonb,
  occurred_at      timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists task_events_user_id_idx
  on public.task_events (user_id, occurred_at desc);

create index if not exists task_events_user_type_idx
  on public.task_events (user_id, event_type, occurred_at desc);

-- ─── 2. Aggregated user metrics (refreshed on each event) ────────────────────

create table if not exists public.user_metrics (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  tasks_created      integer not null default 0,
  tasks_started      integer not null default 0,
  tasks_completed    integer not null default 0,
  tasks_skipped      integer not null default 0,
  tasks_rescheduled  integer not null default 0,
  completion_rate    numeric(6, 4) not null default 0,
  current_streak     integer not null default 0,
  best_streak        integer not null default 0,
  last_active_date   date,
  updated_at         timestamptz not null default now()
);

-- ─── 3. Cached insights (regenerated from events + profile) ──────────────────

create table if not exists public.user_insights (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  best_focus_period        text,
  completion_trends        jsonb not null default '[]'::jsonb,
  procrastination_patterns jsonb not null default '[]'::jsonb,
  generated_at             timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ─── 4. RLS ────────────────────────────────────────────────────────────────

alter table public.task_events enable row level security;
alter table public.user_metrics enable row level security;
alter table public.user_insights enable row level security;

drop policy if exists "task_events_select_own" on public.task_events;
create policy "task_events_select_own"
  on public.task_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "task_events_insert_own" on public.task_events;
create policy "task_events_insert_own"
  on public.task_events for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_metrics_select_own" on public.user_metrics;
create policy "user_metrics_select_own"
  on public.user_metrics for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_metrics_insert_own" on public.user_metrics;
create policy "user_metrics_insert_own"
  on public.user_metrics for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_metrics_update_own" on public.user_metrics;
create policy "user_metrics_update_own"
  on public.user_metrics for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_insights_select_own" on public.user_insights;
create policy "user_insights_select_own"
  on public.user_insights for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "user_insights_insert_own" on public.user_insights;
create policy "user_insights_insert_own"
  on public.user_insights for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "user_insights_update_own" on public.user_insights;
create policy "user_insights_update_own"
  on public.user_insights for update to authenticated
  using (user_id = auth.uid());

-- ─── 5. Refresh metrics from event log ───────────────────────────────────────

create or replace function public.refresh_user_metrics(p_user_id uuid)
returns public.user_metrics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_metrics public.user_metrics;
  v_completed integer;
  v_skipped integer;
  v_rescheduled integer;
  v_created integer;
  v_started integer;
  v_rate numeric;
  v_streak integer := 0;
  v_best integer := 0;
  v_last date;
  v_cursor date;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  select count(*) into v_created
    from public.task_events where user_id = p_user_id and event_type = 'task_created';
  select count(*) into v_started
    from public.task_events where user_id = p_user_id and event_type = 'task_started';
  select count(*) into v_completed
    from public.task_events where user_id = p_user_id and event_type = 'task_completed';
  select count(*) into v_skipped
    from public.task_events where user_id = p_user_id and event_type = 'task_skipped';
  select count(*) into v_rescheduled
    from public.task_events where user_id = p_user_id and event_type = 'task_rescheduled';

  v_rate := case
    when (v_completed + v_skipped) > 0 then v_completed::numeric / (v_completed + v_skipped)
    else 0
  end;

  select max((occurred_at at time zone 'utc')::date) into v_last
    from public.task_events
    where user_id = p_user_id
      and event_type in ('task_completed', 'task_started');

  -- Current streak: consecutive UTC completion days ending today (or yesterday if none today)
  v_streak := 0;
  v_cursor := current_date;

  loop
    if exists (
      select 1 from public.task_events
      where user_id = p_user_id
        and event_type = 'task_completed'
        and (occurred_at at time zone 'utc')::date = v_cursor
    ) then
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    elsif v_streak = 0 and v_cursor = current_date then
      v_cursor := current_date - 1;
    else
      exit;
    end if;
  end loop;

  select greatest(coalesce(um.best_streak, 0), v_streak)
    into v_best
    from public.user_metrics um
    where um.user_id = p_user_id;

  if v_best is null then
    v_best := v_streak;
  end if;

  insert into public.user_metrics (
    user_id, tasks_created, tasks_started, tasks_completed,
    tasks_skipped, tasks_rescheduled, completion_rate,
    current_streak, best_streak, last_active_date, updated_at
  ) values (
    p_user_id, v_created, v_started, v_completed,
    v_skipped, v_rescheduled, v_rate,
    v_streak, v_best, v_last, now()
  )
  on conflict (user_id) do update set
    tasks_created     = excluded.tasks_created,
    tasks_started     = excluded.tasks_started,
    tasks_completed   = excluded.tasks_completed,
    tasks_skipped     = excluded.tasks_skipped,
    tasks_rescheduled = excluded.tasks_rescheduled,
    completion_rate   = excluded.completion_rate,
    current_streak    = excluded.current_streak,
    best_streak       = excluded.best_streak,
    last_active_date  = excluded.last_active_date,
    updated_at        = now()
  returning * into v_metrics;

  return v_metrics;
end;
$$;

-- ─── 6. Track event + refresh metrics (primary API entrypoint) ─────────────

create or replace function public.track_task_event(
  p_task_id text,
  p_event_type text,
  p_task_title text default null,
  p_duration_minutes integer default null,
  p_metadata jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id uuid;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.task_events (
    user_id, task_id, event_type, task_title,
    duration_minutes, metadata, occurred_at
  ) values (
    v_user_id, p_task_id, p_event_type, p_task_title,
    p_duration_minutes, coalesce(p_metadata, '{}'::jsonb), coalesce(p_occurred_at, now())
  )
  returning id into v_event_id;

  perform public.refresh_user_metrics(v_user_id);

  return v_event_id;
end;
$$;

grant execute on function public.track_task_event(text, text, text, integer, jsonb, timestamptz) to authenticated;
grant execute on function public.refresh_user_metrics(uuid) to authenticated;
