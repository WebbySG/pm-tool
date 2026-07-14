-- ─────────────────────────────────────────────────────────────────────────────
-- Quotes feature — schema migration for pm_invoices
--
-- Run this ONCE in the Supabase SQL editor of the LIVE pm-tool project
-- (tfhzuruaaymfhqmeiusr — the one os.webby.sg talks to). Do NOT run it via the
-- Claude Supabase MCP: that points at the wrong project (Omnipulse). See CLAUDE.md
-- "Known Recurring Mistake #10".
--
-- What it does:
--   1. Adds doc_type ('invoice' | 'quote') to pm_invoices.
--   2. Adds quote↔invoice link columns (converted_to / converted_from).
--   3. Widens the status CHECK so quotes can be accepted/declined/expired,
--      while invoices stay draft/sent/paid/void.
--   4. Widens the pm_invoice_logs event whitelist for converted/accepted/declined.
--   5. Adds next_quote_number() — WSGQ-YYYY-MM-DD numbering (mirrors invoices).
-- Safe to re-run: all steps are idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Document type + conversion links --------------------------------------------
ALTER TABLE public.pm_invoices
  ADD COLUMN IF NOT EXISTS doc_type text NOT NULL DEFAULT 'invoice',
  ADD COLUMN IF NOT EXISTS converted_to_invoice_id uuid
    REFERENCES public.pm_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_from_quote_id uuid
    REFERENCES public.pm_invoices(id) ON DELETE SET NULL;

-- doc_type may only be 'invoice' or 'quote'
ALTER TABLE public.pm_invoices DROP CONSTRAINT IF EXISTS pm_invoices_doc_type_check;
ALTER TABLE public.pm_invoices
  ADD CONSTRAINT pm_invoices_doc_type_check CHECK (doc_type IN ('invoice', 'quote'));

-- 2. Status CHECK — status set depends on doc_type -------------------------------
-- Drop ANY existing check constraint on pm_invoices that references `status`
-- (its auto-generated name may vary), then add the doc_type-aware one.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE rel.relname = 'pm_invoices' AND ns.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.pm_invoices DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.pm_invoices
  ADD CONSTRAINT pm_invoices_status_check CHECK (
    (doc_type = 'invoice' AND status IN ('draft', 'sent', 'paid', 'void'))
    OR
    (doc_type = 'quote'   AND status IN ('draft', 'sent', 'accepted', 'declined', 'expired'))
  );

-- 3. Log event whitelist — add converted / accepted / declined -------------------
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE rel.relname = 'pm_invoice_logs' AND ns.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%event%'
  LOOP
    EXECUTE format('ALTER TABLE public.pm_invoice_logs DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.pm_invoice_logs
  ADD CONSTRAINT pm_invoice_logs_event_check CHECK (
    event IN (
      'created', 'updated', 'sent', 'reminder_sent',
      'marked_paid', 'marked_void', 'duplicated',
      'payment_recorded', 'payment_removed',
      'converted', 'accepted', 'declined'
    )
  );

-- 4. Quote numbering: WSGQ-YYYY-MM-DD (same-day duplicates get -2, -3, …) --------
CREATE OR REPLACE FUNCTION public.next_quote_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base      text := 'WSGQ-' || to_char((now() AT TIME ZONE 'Asia/Singapore')::date, 'YYYY-MM-DD');
  candidate text := base;
  n         int  := 2;
BEGIN
  WHILE EXISTS (SELECT 1 FROM public.pm_invoices WHERE invoice_number = candidate) LOOP
    candidate := base || '-' || n;
    n := n + 1;
  END LOOP;
  RETURN candidate;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated, service_role;

-- 5. Refresh PostgREST's schema cache so the new columns/RPC are visible ---------
NOTIFY pgrst, 'reload schema';
