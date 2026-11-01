-- =============================================================================
-- Checks for supabase/review-invites.sql. Run it AFTER that file.
--
-- It reads your real orders (never changes them) and, to test the happy path,
-- saves ONE test review marked "[اختبار-تحقق]" on your newest delivered order,
-- then deletes it again before showing the result. The last result table has
-- one row per check; every row must say pass = true.
--
-- If "a good review is saved" says already_reviewed, that order's product already
-- had a real review: ignore that pair of rows.
-- It needs at least one DELIVERED order. If the first row says false, mark one
-- order delivered in the admin first, then run this again.
-- Delete any saved query text in the editor before pasting this (see the
-- warning at the top of review-invites.sql).
-- =============================================================================

create temp table if not exists _r (n serial, check_name text, expected text, actual text);
truncate _r;
delete from public.reviews where comment like '[اختبار-تحقق]%';

create temp table if not exists _t (delivered uuid, not_delivered uuid, product_ok uuid, product_other uuid);
truncate _t;
insert into _t
select
  (select o.public_token from public.orders o where o.status = 'delivered' order by o.created_at desc limit 1),
  (select o.public_token from public.orders o where o.status <> 'delivered' order by o.created_at desc limit 1),
  (select pv.product_id
     from public.orders o
     join public.order_items oi on oi.order_id = o.id
     join public.product_variants pv on pv.id = oi.variant_id
    where o.status = 'delivered' order by o.created_at desc limit 1),
  null;
update _t set product_other = (select id from public.products where id <> _t.product_ok limit 1);

-- 0. there is a delivered order to test with
insert into _r (check_name, expected, actual)
select 'a delivered order with a traceable product exists', 'true',
       (delivered is not null and product_ok is not null)::text from _t;

-- 1. unknown and undelivered orders give nothing
insert into _r (check_name, expected, actual)
values ('review_context: unknown token', 'null',
        coalesce(public.review_context('00000000-0000-4000-8000-000000000000')::text, 'null'));
insert into _r (check_name, expected, actual)
select 'review_context: order not delivered', 'null',
       case when not_delivered is null then 'no undelivered order to test'
            else coalesce(public.review_context(not_delivered)::text, 'null') end from _t;

-- 2. a delivered order returns products and leaks nothing private
insert into _r (check_name, expected, actual)
select 'review_context: delivered order lists products', 'array',
       coalesce(jsonb_typeof(public.review_context(delivered) -> 'products'), 'null') from _t;
insert into _r (check_name, expected, actual)
select 'review_context: no phone or address in the answer', 'false',
       coalesce((public.review_context(delivered) ?| array['phone','address','wilaya','id'])::text, 'null') from _t;

-- 3. refusals
insert into _r (check_name, expected, actual)
select 'submit: unknown order', 'not_delivered',
       public.submit_order_review('00000000-0000-4000-8000-000000000000', product_ok, 5, 'تعليق جيد', null) ->> 'code' from _t;
insert into _r (check_name, expected, actual)
select 'submit: order not delivered', 'not_delivered',
       case when not_delivered is null then 'no undelivered order to test'
            else public.submit_order_review(not_delivered, product_ok, 5, 'تعليق جيد', null) ->> 'code' end from _t;
insert into _r (check_name, expected, actual)
select 'submit: product not on the order', 'not_in_order',
       public.submit_order_review(delivered, product_other, 5, 'تعليق جيد', null) ->> 'code' from _t;
insert into _r (check_name, expected, actual)
select 'submit: rating 0', 'bad_rating',
       public.submit_order_review(delivered, product_ok, 0, 'تعليق جيد', null) ->> 'code' from _t;
insert into _r (check_name, expected, actual)
select 'submit: rating 6', 'bad_rating',
       public.submit_order_review(delivered, product_ok, 6, 'تعليق جيد', null) ->> 'code' from _t;
insert into _r (check_name, expected, actual)
select 'submit: comment of 2 characters', 'bad_comment',
       public.submit_order_review(delivered, product_ok, 5, 'ab', null) ->> 'code' from _t;
insert into _r (check_name, expected, actual)
select 'submit: photo from another order folder', 'bad_photo',
       public.submit_order_review(delivered, product_ok, 5, 'تعليق جيد',
         'https://example.com/storage/v1/object/public/review-photos/00000000-0000-4000-8000-000000000000/a.jpg') ->> 'code' from _t;

insert into _r (check_name, expected, actual)
select 'submit: photo address on another website', 'bad_photo',
       public.submit_order_review(delivered, product_ok, 5, 'تعليق جيد',
         'https://evil.example/x?/review-photos/' || delivered::text || '/a.jpg') ->> 'code' from _t;
insert into _r (check_name, expected, actual)
select 'submit: photo that was never uploaded', 'bad_photo',
       public.submit_order_review(delivered, product_ok, 5, 'تعليق جيد',
         'https://abc.supabase.co/storage/v1/object/public/review-photos/' || delivered::text || '/missing.jpg') ->> 'code' from _t;

-- 4. the happy path, then a double tap
insert into _r (check_name, expected, actual)
select 'submit: a good review is saved', 'true',
       public.submit_order_review(delivered, product_ok, 5, '[اختبار-تحقق] تعليق', null) ->> 'ok' from _t;
insert into _r (check_name, expected, actual)
select 'submit: the same review again', 'already_reviewed',
       public.submit_order_review(delivered, product_ok, 5, '[اختبار-تحقق] تعليق', null) ->> 'code' from _t;
insert into _r (check_name, expected, actual)
select 'the saved review waits for approval', 'false',
       coalesce((select is_approved::text from public.reviews where comment like '[اختبار-تحقق]%' limit 1), 'no review found');
insert into _r (check_name, expected, actual)
select 'the saved review is linked to its order', '1',
       (select count(*)::text from public.review_orders ro join public.reviews r on r.id = ro.review_id
         where r.comment like '[اختبار-تحقق]%');

-- 5. names, grants, bucket, upload rule
insert into _r (check_name, expected, actual) values
  ('first name: two words', 'Amine', public.review_first_name('Amine Ben Ali')),
  ('first name: Arabic', 'محمد', public.review_first_name('محمد أمين')),
  ('first name: one letter', 'زبون', public.review_first_name('A Benali')),
  ('first name: a very long word is cut to 60', '60', length(public.review_first_name(repeat('a', 200)))::text),
  ('anon cannot read review_orders', 'false', has_table_privilege('anon', 'public.review_orders', 'select')::text),
  ('bucket review-photos: 3 MB limit', '3145728',
     coalesce((select file_size_limit::text from storage.buckets where id = 'review-photos'), 'no bucket')),
  ('upload allowed for a random folder', 'false',
     public.is_review_upload_allowed('00000000-0000-4000-8000-000000000000')::text);
-- (true only while that order still has a product nobody reviewed yet)
insert into _r (check_name, expected, actual)
select 'upload allowed for the delivered order folder', 'true',
       public.is_review_upload_allowed(delivered::text)::text from _t;

-- Clean up the test review, then show the result (all rows must be pass = true).
delete from public.reviews where comment like '[اختبار-تحقق]%';

select n, check_name, expected, actual, (expected = actual) as pass
from _r order by n;
