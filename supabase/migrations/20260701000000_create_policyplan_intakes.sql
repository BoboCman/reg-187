-- Migration: create_policyplan_intakes
-- Created: 2026-07-01
-- Purpose: Intake persistence for PolicyPlan best-interest documentation workflow.
--          Hybrid model: full validated payload in jsonb, key fields denormalized for querying.
--          Intakes are immutable once submitted — no update or delete RLS policies.

create table if not exists public.policyplan_intakes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  advisor_id uuid not null references auth.users(id),
  schema_version text not null,
  primary_objective text,
  ownership_type text,
  status text not null default 'submitted',
  payload jsonb not null
);

create index if not exists policyplan_intakes_advisor_id_idx
  on public.policyplan_intakes (advisor_id);

create index if not exists policyplan_intakes_created_at_idx
  on public.policyplan_intakes (created_at desc);

alter table public.policyplan_intakes enable row level security;

create policy "advisors insert own intakes"
  on public.policyplan_intakes
  for insert
  to authenticated
  with check (advisor_id = auth.uid());

create policy "advisors read own intakes"
  on public.policyplan_intakes
  for select
  to authenticated
  using (advisor_id = auth.uid());
