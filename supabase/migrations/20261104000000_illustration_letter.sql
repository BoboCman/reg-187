-- Migration: illustration_letter
-- Created: 2026-11-04
-- Purpose: Foundation for the Upload > Profile > Letter journey.
--   1. policyplan_intakes keeps the redacted text of the proposed sales
--      illustration (names are redacted in the browser before upload) and
--      a small metadata record about the file.
--   2. policyplan_outputs keeps the structured 187 letter, the extraction
--      summary and the QA report that the n8n workflow posts back.
--   3. advisor_branding holds each advisor's letterhead (firm, logo, colors,
--      disclosures) for the branded PDF.
-- Safe to run more than once. Run by hand in the Supabase SQL editor.

-- ── 1. policyplan_intakes ─────────────────────────────────────────────────────
alter table public.policyplan_intakes
  add column if not exists illustration jsonb,        -- { filename, size_bytes, page_count, redaction_counts, extracted_at }
  add column if not exists illustration_text text;    -- redacted illustration text sent to n8n

-- ── 2. policyplan_outputs ─────────────────────────────────────────────────────
alter table public.policyplan_outputs
  add column if not exists letter jsonb,              -- structured 187 letter (sections)
  add column if not exists extraction jsonb,          -- policy facts summary from ATLAS-1 / ATLAS-2
  add column if not exists qa jsonb,                  -- letter QA checks from the workflow
  add column if not exists workflow_version text;

-- ── 3. advisor_branding ───────────────────────────────────────────────────────
create table if not exists public.advisor_branding (
  advisor_id uuid primary key references auth.users (id) on delete cascade,
  advisor_name text,
  advisor_title text,
  advisor_credentials text,          -- e.g. CLU, ChFC
  firm_name text,
  firm_address text,
  phone text,
  email text,
  license_number text,
  logo_base64 text,                  -- data URI, kept small (< 300 KB)
  brand_primary_color text,          -- hex, e.g. #1D4ED8
  brand_secondary_color text,
  disclosures text,                  -- firm disclosures printed on the letter
  updated_at timestamptz not null default now()
);

alter table public.advisor_branding enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'advisor_branding'
      and policyname = 'advisors manage own branding'
  ) then
    create policy "advisors manage own branding"
      on public.advisor_branding
      for all
      to authenticated
      using (advisor_id = auth.uid())
      with check (advisor_id = auth.uid());
  end if;
end $$;
