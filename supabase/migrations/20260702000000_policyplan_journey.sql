-- Migration: policyplan_journey
-- Created: 2026-07-02
-- Purpose: Extend policyplan tables for the six-stage best-interest journey.
--          All ALTER statements are guarded with IF NOT EXISTS / IF EXISTS.
--          Safe to apply against a DB that already has the earlier migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. policyplan_intakes — journey columns
-- ─────────────────────────────────────────────────────────────────────────────

-- Frozen snapshot columns (computed once at submit, never recomputed)
alter table public.policyplan_intakes
  add column if not exists emphasis jsonb,
  add column if not exists suitability_flags jsonb,
  add column if not exists flag_resolutions jsonb;

-- Versioned resubmit lineage
alter table public.policyplan_intakes
  add column if not exists version int not null default 1,
  add column if not exists supersedes_intake_id uuid
    references public.policyplan_intakes (id);

-- RLS: allow advisors to update their own intakes (for status + flag_resolutions)
create policy if not exists "advisors update own intakes"
  on public.policyplan_intakes
  for update
  to authenticated
  using (advisor_id = auth.uid())
  with check (advisor_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. policyplan_outputs — create table if not present, then extend
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.policyplan_outputs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  intake_id uuid not null references public.policyplan_intakes(id),
  advisor_id uuid not null references auth.users(id),
  status text not null default 'pending',
  advisor_letter text,
  client_summary text,
  suitability_flags jsonb,
  completed_at timestamptz,
  meta jsonb
);

create index if not exists policyplan_outputs_intake_id_idx
  on public.policyplan_outputs (intake_id);

create index if not exists policyplan_outputs_advisor_id_idx
  on public.policyplan_outputs (advisor_id);

-- Extend outputs with journey columns
alter table public.policyplan_outputs
  add column if not exists emphasis jsonb,
  add column if not exists flag_resolutions jsonb,
  add column if not exists adopted_by uuid references auth.users(id),
  add column if not exists adopted_at timestamptz,
  add column if not exists adoption_confirmation text,
  add column if not exists content_hash text,
  add column if not exists version int not null default 1;

-- Normalize legacy 'complete' status to 'draft'
-- (outputs written by the old pipeline used 'complete'; the new vocabulary is
--  'pending' → 'draft' → 'final', plus 'error')
update public.policyplan_outputs
  set status = 'draft'
  where status = 'complete';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. policyplan_outputs — RLS (match intakes style)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.policyplan_outputs enable row level security;

create policy if not exists "advisors insert own outputs"
  on public.policyplan_outputs
  for insert
  to authenticated
  with check (advisor_id = auth.uid());

create policy if not exists "advisors read own outputs"
  on public.policyplan_outputs
  for select
  to authenticated
  using (advisor_id = auth.uid());

create policy if not exists "advisors update own outputs"
  on public.policyplan_outputs
  for update
  to authenticated
  using (advisor_id = auth.uid())
  with check (advisor_id = auth.uid());
