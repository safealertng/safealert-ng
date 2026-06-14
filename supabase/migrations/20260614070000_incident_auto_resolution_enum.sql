-- 7-day auto-resolution timer: incidents whose auto_resolve_at has passed
-- with no recent admin activity are flagged 'pending_review' for admin
-- triage. ALTER TYPE ... ADD VALUE must commit before any function or
-- policy can reference the new label, so it lives in its own migration
-- ahead of 20260614080000_incident_auto_resolution.sql.

alter type public.incident_status add value if not exists 'pending_review';
