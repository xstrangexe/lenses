-- =============================================================================
-- Undo supabase/review-invites.sql, completely.
--
-- Drops exactly what that file added and nothing else. Reviews already written
-- through the invite stay in `reviews` (only the link to their order goes).
-- Delete the saved import query's text from the SQL editor before running this
-- (see the warning at the top of review-invites.sql).
--
-- The photos in the bucket are not deleted by SQL (Supabase blocks that). If you
-- also want them gone: Storage -> review-photos -> select all -> delete, THEN
-- run the last statement below.
-- =============================================================================

drop policy if exists "Delivered buyers upload review photos" on storage.objects;

drop function if exists public.submit_order_review(uuid, uuid, int, text, text);
drop function if exists public.review_context(uuid);
drop function if exists public.is_review_upload_allowed(text);
drop function if exists public.review_first_name(text);

drop table if exists public.review_orders;

-- Only after emptying the bucket in the dashboard:
-- delete from storage.buckets where id = 'review-photos';
