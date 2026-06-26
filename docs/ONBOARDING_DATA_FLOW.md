# Momentum App — Onboarding Data Flow Report

**Project:** MomentumApp (Expo SDK 56 · React Native)  
**Date:** June 2026  
**Purpose:** Complete map of what onboarding collects, where it is stored, and what reaches Supabase.

---

## Executive summary

- Onboarding has **4 steps** (procrastination pattern, peak focus time, circadian rhythm, coaching style).
- **All answers are saved locally** on the device via Zustand + AsyncStorage.
- **Only 3 quiz answers** (+ name/email from a later screen) are *intended* for Supabase `profiles` — and only if the user signs in and completes the Credentials screen.
- **Wake/sleep times are never sent to Supabase** (no DB columns exist).
- **Derived personalization** (greetings, coaching copy, schedule hints) is computed at runtime and never persisted.
- Users can **skip Auth** and **skip Credentials**, so cloud persistence is often **never reached**.

---

## Navigation flow

```
Splash → Onboarding (4 steps) → Auth → Credentials → Pro Offer → Main Tabs
                                    ↘ skip ────────────────┘
Credentials ─ skip ──────────────────────────────────────→ Pro Offer
```

**Key files:** `src/navigation/RootNavigator.tsx`, `OnboardingScreen.tsx`, `AuthScreen.tsx`, `CredentialsScreen.tsx`

> **Note:** `hasOnboarded` is set when onboarding finishes but is **not used** to skip onboarding on return visits — Splash always shows “Get Started” again.

---

## 1. Every onboarding question collected

Defined in `src/screens/OnboardingScreen.tsx` and `src/data/mockData.ts` (`ONBOARDING_OPTIONS`).

### Step 1 — Procrastination pattern
**Question:** “What usually makes you procrastinate?”  
**Type:** Single select  
**Stored as:** `onboardingData.procrastinationType`

| Key | Label shown to user |
|-----|---------------------|
| `overwhelmed_tasks` | I feel overwhelmed by large tasks |
| `waiting_motivation` | I keep waiting for motivation |
| `dont_know_start` | I don't know where to start |
| `easily_distracted` | I get distracted easily |
| `changing_plans` | I keep changing my plans |
| `underestimate_time` | I fear I will fail |

### Step 2 — Peak focus time
**Question:** “When are you naturally most focused?”  
**Type:** Single select  
**Stored as:** `onboardingData.peakTime`

| Key | Label |
|-----|-------|
| `morning` | Morning |
| `afternoon` | Afternoon |
| `evening` | Evening |

### Step 3 — Circadian rhythm
**Question:** “What is your circadian rhythm?”  
**Type:** Two sliders (`CircadianRhythmPicker.tsx`)  
**Stored as:** `wakeTime` and `sleepTime` (top-level store fields, **not** inside `onboardingData`)

| Field | Format | Range | Default |
|-------|--------|-------|---------|
| Wake time | Minutes from midnight | 5:00 AM – 10:00 AM (300–600), step 15 min | `390` (6:30 AM) |
| Sleep time | Minutes from midnight | 10:00 PM – 5:00 AM (1320–1740), step 15 min | `1365` (~10:45 PM) |

Written to the store **on each slider move**, not batched at “Finish”.

### Step 4 — Coaching style
**Question:** “How should Momentum coach you?”  
**Type:** Single select (with descriptions)  
**Stored as:** `onboardingData.coaching`

| Key | Label |
|-----|-------|
| `supportive` | Supportive |
| `balanced` | Balanced |
| `strict` | Strict |

---

## 2. Where each answer is stored

### A. Local device (primary storage)

**Mechanism:** Zustand `persist` → AsyncStorage  
**Storage key:** `momentum-app-store`  
**File:** `src/store/useAppStore.ts`

| Data | Zustand field | When written |
|------|---------------|--------------|
| Procrastination type | `onboardingData.procrastinationType` | Onboarding “Finish ✓” |
| Peak time | `onboardingData.peakTime` | Onboarding “Finish ✓” |
| Coaching style | `onboardingData.coaching` | Onboarding “Finish ✓” |
| Wake time | `wakeTime` | Each slider change (step 3) |
| Sleep time | `sleepTime` | Each slider change (step 3) |
| Onboarding done flag | `hasOnboarded` | Onboarding “Finish ✓” |

### B. In-memory only (during onboarding)

| Data | Location | Lifetime |
|------|----------|----------|
| Current step, UI selections | `OnboardingScreen` local state | Until finish |
| Success overlay | `showSuccess` | Until navigate to Auth |

### C. Derived at runtime (not stored)

| Output | Source inputs | Used by |
|--------|---------------|---------|
| `PersonalizationContext` — greetings, coaching messages, schedule hints, badges | `procrastinationType`, `peakTime`, `coaching` only | `usePersonalization()` across app |

**Files:** `src/personalization/engine.ts`, `src/personalization/usePersonalization.ts`, `src/personalization/content.ts`

Wake/sleep feed **Brain Dump** capacity UI only — **not** the personalization engine.

### D. Post-onboarding (related screens)

| Screen | Data collected | Local storage | Supabase |
|--------|----------------|---------------|----------|
| **Auth** | Email (magic link sign-in) | `account.email` | `auth.users` session (AsyncStorage via supabase-js) |
| **Credentials** | Name, email | `account.name`, `account.email`, `account.createdAt` | `profiles` upsert (best-effort) |

---

## 3. Supabase tables involved

| Table | Role |
|-------|------|
| `auth.users` | Created when user completes magic-link sign-in |
| `public.profiles` | One row per user; holds profile + onboarding quiz answers |

**No SQL migration files in the repo.** The `profiles` table was created manually in the Supabase SQL Editor.

**App code:**
- `src/supabase/client.ts` — Supabase client + auth session storage
- `src/repositories/profileRepo.ts` — `upsertMyProfile()`
- `src/screens/CredentialsScreen.tsx` — **only place** that calls `upsertMyProfile()`

`OnboardingScreen` does **not** write to Supabase on finish.

---

## 4. Database columns used

### `public.profiles` schema (Phase 1 SQL)

```sql
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  name                text,
  procrastination_type text,
  peak_time           text,
  coach_style         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
```

### What the app writes

| Column | Set by app? | Value source |
|--------|-------------|--------------|
| `id` | Yes | `auth.user.id` |
| `email` | Yes | Credentials screen / auth user |
| `name` | Yes | Credentials screen |
| `procrastination_type` | Yes | `onboardingData.procrastinationType` |
| `peak_time` | Yes | `onboardingData.peakTime` |
| `coach_style` | Yes | `onboardingData.coaching` |
| `created_at` | DB default | Not set by app on insert |
| `updated_at` | Yes | ISO timestamp on upsert |

### Row Level Security (RLS)

- `profiles_select_own` — authenticated users read own row (`id = auth.uid()`)
- `profiles_insert_own` — authenticated users insert own row
- `profiles_update_own` — authenticated users update own row

---

## 5. Data that is NOT persisted (or only partially)

### Never sent to Supabase

| Data | Local only? | Notes |
|------|-------------|-------|
| Wake time | Yes | No `wake_time` column in `profiles` |
| Sleep time | Yes | No `sleep_time` column in `profiles` |
| Derived personalization | Recomputed each session | Greetings, hints, coaching copy |
| `hasOnboarded` | Yes | Not in DB; not used for routing |

### Intended for Supabase but often never saved

| Data | Why it may not reach the cloud |
|------|--------------------------------|
| `procrastination_type`, `peak_time`, `coach_style` | Upsert only on **Credentials → Continue** |
| | Requires **authenticated** Supabase session |
| | Errors **silently ignored** (`.catch(() => {})`) |
| | User can **skip Auth** → no session |
| | User can **skip Credentials** → upsert never called |
| `name`, `email` | Same conditions as above |

### Other gaps

- User can repeat onboarding from Splash; later run overwrites local store.
- No sync **from** Supabase back to the app on login (one-way upsert only).
- Schedule, constraints, tasks, insights remain local or mock — out of onboarding scope.

---

## End-to-end data flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING SCREEN (4 steps)                   │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ Step 1       │ Step 2       │ Step 3       │ Step 4            │
│ procrastin.  │ peak time    │ wake + sleep │ coaching style    │
│ type         │              │ (sliders)    │                   │
└──────┬───────┴──────┬───────┴──────┬───────┴─────────┬─────────┘
       │              │              │                 │
       ▼              ▼              ▼                 ▼
┌──────────────────────────────────────┐    ┌─────────────────────┐
│  Zustand → AsyncStorage (device)     │    │ wakeTime / sleepTime │
│  onboardingData {                    │    │ (top-level fields)   │
│    procrastinationType,              │    └──────────┬──────────┘
│    peakTime,                         │               │
│    coaching                          │               ▼
│  }                                   │    Brain Dump capacity UI
│  hasOnboarded: true                  │
└──────────────┬───────────────────────┘
               │
               ├──────────────────► Personalization engine (runtime)
               │                    → greetings, coaching, schedule hints
               │
               ▼
         Auth screen (optional)
               │
               ├─ skip ──────────────────────────────┐
               │                                       │
               ▼                                       ▼
         Credentials screen                      Pro Offer → Main app
               │
               ├─ skip ──────────────────────────────┘
               │
               ▼ (only if signed in + Continue)
         upsertMyProfile() → Supabase public.profiles
```

---

## Persistence matrix (quick reference)

| Field | Collected in onboarding? | Local (device) | Supabase `profiles` |
|-------|--------------------------|----------------|---------------------|
| Procrastination type | Yes | Yes | Only if Auth + Credentials |
| Peak time | Yes | Yes | Only if Auth + Credentials |
| Coaching style | Yes | Yes | Only if Auth + Credentials |
| Wake time | Yes | Yes | **No** |
| Sleep time | Yes | Yes | **No** |
| hasOnboarded | Yes (flag) | Yes | **No** |
| Name | No (Credentials) | Yes | Only if Auth + Credentials |
| Email | No (Auth/Credentials) | Yes | Only if Auth + Credentials |
| Personalization output | Derived | Recomputed | **No** |

---

## Key source files

| File | Responsibility |
|------|----------------|
| `src/screens/OnboardingScreen.tsx` | 4-step UI, local state, finish handler |
| `src/data/mockData.ts` | Question options (`ONBOARDING_OPTIONS`) |
| `src/components/CircadianRhythmPicker.tsx` | Wake/sleep sliders |
| `src/store/useAppStore.ts` | Persistent local state |
| `src/personalization/engine.ts` | Derives UX from quiz answers |
| `src/screens/AuthScreen.tsx` | Magic-link sign-in (optional) |
| `src/screens/CredentialsScreen.tsx` | Name/email + Supabase upsert |
| `src/repositories/profileRepo.ts` | `profiles` table upsert |
| `src/supabase/client.ts` | Supabase client + auth sessions |

---

## Recommended next steps (for discussion)

1. Add `wake_time` and `sleep_time` columns to `profiles` and include them in `upsertMyProfile`.
2. Call profile upsert after onboarding **and** after auth, not only on Credentials.
3. Surface upsert errors instead of swallowing them.
4. Use `hasOnboarded` (or Supabase profile fetch) to skip onboarding for returning users.
5. Load profile from Supabase on sign-in so data survives device changes.

---

*Generated from codebase analysis of MomentumApp. No code changes were made for this document.*
