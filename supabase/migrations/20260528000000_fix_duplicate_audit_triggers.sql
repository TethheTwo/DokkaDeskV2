-- Fix duplicate audit_log entries.
-- Migration 20260521220043 created new triggers (trg_audit_*) but the old ones
-- (trg_tickets_audit, trg_notes_audit, trg_attachments_audit) from migration
-- 20260519163830 were never dropped. Both sets fire on the same tables,
-- producing TWO audit_log entries per action.

DROP TRIGGER IF EXISTS trg_tickets_audit     ON public.tickets;
DROP TRIGGER IF EXISTS trg_notes_audit       ON public.ticket_notes;
DROP TRIGGER IF EXISTS trg_attachments_audit ON public.ticket_attachments;
