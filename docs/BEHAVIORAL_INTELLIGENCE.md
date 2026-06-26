# Momentum — Behavioral Intelligence Backend

## Overview

Client-side Supabase layer that logs task behavior, aggregates metrics, generates insights, and builds AI coaching context. No separate Node server — all persistence goes through Supabase Postgres + RPC.

```
App UI → eventTracker → taskEventsRepo → track_task_event (RPC)
                                              ↓
                                        task_events
                                              ↓
                                   refresh_user_metrics
                                              ↓
                                        user_metrics

insightsEngine ← task_events (fetched) → insightsRepo → user_insights
aiContextBuilder ← profile + metrics + events + insights → AICoachingContext
```

---

## 1. Supabase schema changes

**Migration file:** `supabase/migrations/20260627_behavioral_intelligence.sql`

Run in **Supabase Dashboard → SQL Editor**.

### `task_events` (append-only log)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | auto |
| `user_id` | uuid FK → auth.users | RLS: own rows only |
| `task_id` | text | client task id |
| `event_type` | text | `task_created`, `task_started`, `task_completed`, `task_skipped`, `task_rescheduled` |
| `task_title` | text | optional |
| `duration_minutes` | integer | optional |
| `metadata` | jsonb | source, skip_reason, reschedule times |
| `occurred_at` | timestamptz | when the behavior happened |

### `user_metrics` (aggregated per user)

| Column | Type |
|--------|------|
| `user_id` | uuid PK |
| `tasks_created` | integer |
| `tasks_started` | integer |
| `tasks_completed` | integer |
| `tasks_skipped` | integer |
| `tasks_rescheduled` | integer |
| `completion_rate` | numeric (0–1) |
| `current_streak` | integer (consecutive completion days) |
| `best_streak` | integer |
| `last_active_date` | date |
| `updated_at` | timestamptz |

### `user_insights` (cached insights)

| Column | Type |
|--------|------|
| `user_id` | uuid PK |
| `best_focus_period` | text |
| `completion_trends` | jsonb (7-day array) |
| `procrastination_patterns` | jsonb |
| `generated_at` | timestamptz |

### RPC functions

| Function | Purpose |
|----------|---------|
| `track_task_event(...)` | Insert event + refresh metrics (primary write API) |
| `refresh_user_metrics(user_id)` | Recompute metrics from event log |

---

## 2. API design (TypeScript client layer)

All access via `IntelligenceAPI` (`src/intelligence/api.ts`):

| Method | Returns | Description |
|--------|---------|-------------|
| `trackTaskCreated(task)` | void (async) | Brain dump task add |
| `trackTaskStarted(id, title, mins)` | void | Focus session start |
| `trackTaskCompleted(id, title, mins)` | void | Focus session done |
| `trackTaskSkipped(id, title, reason?)` | void | Schedule skip (ready for UI) |
| `trackTaskRescheduled(id, title, from, to)` | void | Schedule move (ready for UI) |
| `fetchMetrics()` | `UserMetrics` | Read `user_metrics` |
| `refreshMetrics()` | `UserMetrics` | Force server recompute |
| `fetchRecentEvents(limit?, days?)` | `TaskEventRow[]` | Raw event log |
| `fetchCachedInsights()` | `UserInsights \| null` | Cached insights row |
| `refreshInsights()` | `UserInsights` | Recompute + upsert insights |
| `buildAIContext()` | `AICoachingContext` | **Full AI coaching payload** |

### Example: AI coaching request

```typescript
import { IntelligenceAPI } from '../intelligence';

const ctx = await IntelligenceAPI.buildAIContext();
// ctx.onboardingProfile — procrastination_type, peak_time, coach_style, wake/sleep
// ctx.behaviorProfile   — derived scheduling traits
// ctx.metrics           — completion_rate, streaks, counts
// ctx.insights          — best_focus_period, trends, patterns
// ctx.recentTaskHistory — last 20 tasks by latest event
// ctx.coachingDirectives — prompt-ready instructions for the LLM
```

---

## 3. TypeScript types

**File:** `src/intelligence/types.ts`

| Type | Purpose |
|------|---------|
| `TaskEventType` | Union of 5 event types |
| `TaskEventRow` | DB row shape |
| `TrackTaskEventInput` | RPC input |
| `UserMetrics` | Camel-cased metrics for UI/AI |
| `UserInsights` | Insights package |
| `CompletionTrendPoint` | Daily trend data point |
| `ProcrastinationPattern` | Detected pattern with severity |
| `AICoachingContext` | Full AI request payload |
| `OnboardingProfileSnapshot` | Static profile slice |
| `RecentTaskHistoryItem` | Per-task latest event |

---

## 4. Files created

| File | Role |
|------|------|
| `supabase/migrations/20260627_behavioral_intelligence.sql` | Schema + RLS + RPC |
| `src/intelligence/types.ts` | Shared types |
| `src/intelligence/insightsEngine.ts` | Pure insights computation |
| `src/intelligence/aiContextBuilder.ts` | Assembles AI coaching context |
| `src/intelligence/eventTracker.ts` | Fire-and-forget event emission |
| `src/intelligence/api.ts` | Public API facade |
| `src/intelligence/index.ts` | Barrel exports |
| `src/repositories/taskEventsRepo.ts` | Supabase event I/O |
| `src/repositories/userMetricsRepo.ts` | Supabase metrics I/O |
| `src/repositories/insightsRepo.ts` | Insights cache I/O |
| `docs/BEHAVIORAL_INTELLIGENCE.md` | This document |

---

## 5. Files modified

| File | Change | Why |
|------|--------|-----|
| `src/store/useAppStore.ts` | `addTask` calls `trackTaskCreated` | Emit `task_created` on brain dump |
| `src/screens/FocusModeScreen.tsx` | Track `task_started` / `task_completed` | Focus session lifecycle |
| `src/screens/DailyScheduleScreen.tsx` | Pass `taskId` to FocusMode | Stable id for schedule blocks |
| `src/navigation/RootNavigator.tsx` | `taskId` on FocusMode params | Type-safe navigation |

**Not modified:** onboarding UI (per requirement).

---

## 6. Implementation plan (phases)

### Phase 1 — Done (this PR)
- [x] Supabase tables + RLS + RPC
- [x] Event tracking for create / start / complete
- [x] Metrics aggregation on server
- [x] Insights engine (client-side pure functions)
- [x] AI context builder
- [x] Repository pattern matching existing `profileRepo`

### Phase 2 — Next
- [ ] Wire `trackTaskSkipped` / `trackTaskRescheduled` from schedule UI actions
- [ ] Replace hardcoded `DailySummaryScreen` metrics with `IntelligenceAPI.fetchMetrics()`
- [ ] Pass `buildAICoachingContext()` into AIAnalysis / coaching endpoints

### Phase 3 — Later
- [ ] Offline event queue (AsyncStorage) for unauthenticated users
- [ ] Supabase Edge Function for LLM insights generation
- [ ] Hydrate local store from Supabase on login

---

## 7. Requirements checklist

| Requirement | Implementation |
|-------------|----------------|
| task_events system | `task_events` table + `track_task_event` RPC + `eventTracker` |
| task_created | `useAppStore.addTask` |
| task_started | `FocusModeScreen` mount |
| task_completed | `FocusModeScreen` timer / complete |
| task_skipped | `trackTaskSkipped()` exported, ready for schedule UI |
| task_rescheduled | `trackTaskRescheduled()` exported, ready for schedule UI |
| user_metrics | `user_metrics` table + `refresh_user_metrics` |
| completion_rate | `completed / (completed + skipped)` |
| tasks_completed / skipped / rescheduled | Counted in RPC |
| current_streak | Consecutive completion days in RPC |
| insights engine | `insightsEngine.ts` |
| best_focus_period | Hour-bucket analysis of completions |
| completion_trends | 7-day rollup |
| procrastination_patterns | Rule-based detection from events + profile |
| AI context builder | `aiContextBuilder.ts` → `AICoachingContext` |

---

*Requires authenticated Supabase session for cloud persistence. Unsigned users keep local tasks only; events are silently skipped with a console warning.*
