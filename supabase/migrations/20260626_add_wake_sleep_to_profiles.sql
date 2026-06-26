-- Add circadian rhythm fields collected during onboarding (step 3).
-- Run in Supabase Dashboard → SQL Editor if not using the Supabase CLI.

alter table public.profiles
  add column if not exists wake_time integer,
  add column if not exists sleep_time integer;

comment on column public.profiles.wake_time is 'Minutes from midnight (e.g. 390 = 6:30 AM)';
comment on column public.profiles.sleep_time is 'Minutes from midnight (e.g. 1365 = 10:45 PM)';
