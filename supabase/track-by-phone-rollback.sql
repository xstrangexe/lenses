-- =============================================================================
-- Undo supabase/track-by-phone.sql, completely.
--
-- Drops exactly what that file added and nothing else. No order, product or
-- review is touched. Delete the saved import query's text from the SQL editor
-- before running this (see the warning at the top of track-by-phone.sql).
-- =============================================================================

drop function if exists public.lookup_orders_by_phone(text);
drop function if exists public.track_masked_name(text);
drop table if exists public.phone_lookup_log;
