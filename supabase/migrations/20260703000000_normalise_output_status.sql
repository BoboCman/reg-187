-- Migration: normalise_output_status
-- Purpose:
--   1. Backfill any existing rows where n8n wrote status = 'complete' — map them to 'draft'
--      so the CaseWorkspace journey rail unlocks stage 5 (Adopt) correctly.
--   2. Add a BEFORE INSERT OR UPDATE trigger so that any future n8n writes of 'complete'
--      are silently normalised to 'draft' at the database level.  This means a single
--      word change in the n8n Supabase node (complete → draft) is sufficient going
--      forward, but if the n8n node is ever mis-configured again the UI still works.

-- ── 1. Backfill ──────────────────────────────────────────────────────────────
UPDATE policyplan_outputs
SET    status     = 'draft',
       updated_at = now()
WHERE  status = 'complete';

-- ── 2. Normalisation function ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION policyplan_normalise_output_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'complete' THEN
    NEW.status := 'draft';
  END IF;
  RETURN NEW;
END;
$$;

-- ── 3. Attach trigger ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_normalise_output_status ON policyplan_outputs;

CREATE TRIGGER trg_normalise_output_status
BEFORE INSERT OR UPDATE OF status
ON policyplan_outputs
FOR EACH ROW
EXECUTE FUNCTION policyplan_normalise_output_status();
