-- Migration: illustration_companion
-- Created: 2026-11-05
-- Purpose: PolicyPlan 2.0 Illustration Companion. Additive only:
--   * new columns on policyplan_intakes (the case) and policyplan_outputs (drafts and approved snapshots);
--   * policyplan_audit_events (append-only) and policyplan_release_policies (firm approval of client use);
--   * triggers so Companion rows are written only by the server (service role) and approved
--     snapshots cannot be changed, only superseded.
-- Existing Reg 187 rows keep case_type = 'reg187_letter' and are not modified.
-- Safe to run more than once. Run by hand in the Supabase SQL editor.

-- ── 1. Cases ──────────────────────────────────────────────────────────────────
alter table public.policyplan_intakes
  add column if not exists case_type text not null default 'reg187_letter',
  add column if not exists companion_phase text,
  add column if not exists companion_revision int not null default 1,
  add column if not exists case_meta jsonb,             -- jurisdiction, producer display name, case label
  add column if not exists brief jsonb,                 -- client objective brief (companion-brief.v1)
  add column if not exists extraction jsonb,            -- { job_id, status, attempts, requested_at, completed_at, atlas1, atlas2, atlas2_registry, error }
  add column if not exists evidence jsonb,              -- evidence packet for the current revision (companion-evidence.v1)
  add column if not exists fact_corrections jsonb not null default '[]'::jsonb,
  add column if not exists facts_confirmed jsonb,       -- { by, at, revision }
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'policyplan_intakes_case_type_chk') then
    alter table public.policyplan_intakes
      add constraint policyplan_intakes_case_type_chk check (case_type in ('reg187_letter', 'illustration_companion'));
  end if;
end $$;

create index if not exists policyplan_intakes_case_type_idx on public.policyplan_intakes (advisor_id, case_type, created_at desc);

-- ── 2. Drafts and approved snapshots ─────────────────────────────────────────
alter table public.policyplan_outputs
  add column if not exists case_type text not null default 'reg187_letter',
  add column if not exists revision int,
  add column if not exists job_id uuid,
  add column if not exists companion jsonb,             -- companion.v1 draft (plan, blocks, observations, validation)
  add column if not exists approval jsonb,              -- { scope_hash, verified_items, by, by_name, at, acknowledgement }
  add column if not exists artifact_id text,
  add column if not exists superseded_at timestamptz;

create unique index if not exists policyplan_outputs_job_id_key on public.policyplan_outputs (job_id) where job_id is not null;
create index if not exists policyplan_outputs_case_rev_idx on public.policyplan_outputs (intake_id, revision);

-- ── 3. Audit events (append-only) ────────────────────────────────────────────
create table if not exists public.policyplan_audit_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  case_id uuid not null references public.policyplan_intakes (id),
  output_id uuid references public.policyplan_outputs (id),
  advisor_id uuid not null references auth.users (id),
  actor_id uuid references auth.users (id),          -- null for workflow callbacks
  event text not null,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists policyplan_audit_events_case_idx on public.policyplan_audit_events (case_id, created_at);
alter table public.policyplan_audit_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'policyplan_audit_events' and policyname = 'advisors read own audit events') then
    create policy "advisors read own audit events" on public.policyplan_audit_events
      for select to authenticated using (advisor_id = auth.uid());
  end if;
end $$;

create or replace function public.policyplan_audit_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'policyplan_audit_events is append-only';
end $$;
drop trigger if exists trg_policyplan_audit_append_only on public.policyplan_audit_events;
create trigger trg_policyplan_audit_append_only before update or delete on public.policyplan_audit_events
  for each row execute function public.policyplan_audit_append_only();

-- ── 4. Release policy (firm / legal approval of client use) ──────────────────
-- Set by the platform operator in the SQL editor after the adopting firm's
-- legal or compliance approval. Producers can read their own row; nobody can
-- write it from the app.
create table if not exists public.policyplan_release_policies (
  advisor_id uuid primary key references auth.users (id) on delete cascade,
  external_client_export_allowed boolean not null default false,
  enhanced_numeric_mode_allowed boolean not null default false,
  approved_jurisdictions text[] not null default '{}',
  approved_product_classes text[] not null default '{}',
  approval_reference text,             -- e.g. firm compliance approval number / memo
  effective_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.policyplan_release_policies enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'policyplan_release_policies' and policyname = 'advisors read own release policy') then
    create policy "advisors read own release policy" on public.policyplan_release_policies
      for select to authenticated using (advisor_id = auth.uid());
  end if;
end $$;

-- ── 5. Server-only writes for Companion rows ─────────────────────────────────
-- Existing RLS lets an advisor update their own rows with the anon key. For
-- Companion rows that would allow a browser to rewrite evidence or an
-- approval, so only the service role (the app server) may write them.
create or replace function public.policyplan_companion_server_only() returns trigger language plpgsql as $$
declare
  r text := coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                     (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), '');
begin
  if r in ('authenticated', 'anon') then
    if (tg_op = 'INSERT' and new.case_type = 'illustration_companion')
       or (tg_op in ('UPDATE', 'DELETE') and old.case_type = 'illustration_companion')
       or (tg_op = 'UPDATE' and new.case_type is distinct from old.case_type) then
      raise exception 'Illustration Companion records are written by the server only';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists trg_policyplan_intakes_companion_server_only on public.policyplan_intakes;
create trigger trg_policyplan_intakes_companion_server_only before insert or update or delete on public.policyplan_intakes
  for each row execute function public.policyplan_companion_server_only();
drop trigger if exists trg_policyplan_outputs_companion_server_only on public.policyplan_outputs;
create trigger trg_policyplan_outputs_companion_server_only before insert or update or delete on public.policyplan_outputs
  for each row execute function public.policyplan_companion_server_only();

-- ── 6. Approved snapshots are immutable ──────────────────────────────────────
-- A final Companion output may only move to 'superseded' (with superseded_at).
create or replace function public.policyplan_companion_snapshot_immutable() returns trigger language plpgsql as $$
begin
  if old.case_type = 'illustration_companion' and old.status in ('final', 'superseded') then
    if tg_op = 'DELETE' then
      raise exception 'Approved Companion snapshots cannot be deleted';
    end if;
    if old.status = 'superseded'
       or new.status <> 'superseded'
       or new.companion is distinct from old.companion
       or new.approval is distinct from old.approval
       or new.content_hash is distinct from old.content_hash
       or new.artifact_id is distinct from old.artifact_id
       or new.revision is distinct from old.revision then
      raise exception 'Approved Companion snapshots are immutable (only final -> superseded is allowed)';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_policyplan_outputs_snapshot_immutable on public.policyplan_outputs;
create trigger trg_policyplan_outputs_snapshot_immutable before update or delete on public.policyplan_outputs
  for each row execute function public.policyplan_companion_snapshot_immutable();
