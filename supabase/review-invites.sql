-- =============================================================================
-- Review invites: a delivered buyer reviews their order, with one photo.
--
-- ADDITIVE ONLY. This file adds one table, three functions, one storage bucket
-- and its policies. It changes no existing table, trigger or policy, so it
-- cannot touch products, orders or existing reviews. Running it twice is safe.
-- To undo it completely, run supabase/review-invites-rollback.sql.
--
-- BEFORE YOU RUN IT (Supabase dashboard -> SQL Editor):
--   1. The editor may open on a SAVED QUERY that deletes all products (the old
--      catalogue import). Select all and DELETE its text first, then paste this
--      file. Never press Run while that text is in the editor.
--   2. Paste this whole file, press Run. Expect "Success. No rows returned".
--   3. Then run supabase/review-invites-verify.sql (it undoes its own test data).
--
-- Design: docs/superpowers/specs/2026-11-01-review-invites-design.md
-- =============================================================================

-- --- Which order a review came from -----------------------------------------
-- A separate table, so `reviews` and its trigger stay untouched. Anonymous
-- visitors have no grant on it; only the functions below and admins use it.
create table if not exists public.review_orders (
  review_id  uuid primary key references public.reviews(id)  on delete cascade,
  order_id   uuid not null    references public.orders(id)   on delete cascade,
  product_id uuid not null    references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

alter table public.review_orders enable row level security;

drop policy if exists "Admins manage review orders" on public.review_orders;
create policy "Admins manage review orders"
  on public.review_orders for all to authenticated
  using      ((select public.has_admin_role((select auth.uid()), array['owner','staff']::public.admin_role[])) is true)
  with check ((select public.has_admin_role((select auth.uid()), array['owner','staff']::public.admin_role[])) is true);

grant select, insert, update, delete on public.review_orders to authenticated;

-- --- First name only ---------------------------------------------------------
-- Reviews are public and orders hold full names, so only the first word shows.
-- `validate_review()` refuses names under 2 characters, so a one-letter first
-- name becomes "زبون" (customer) instead of failing the whole review.
create or replace function public.review_first_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when length(regexp_replace(trim(coalesce(p_name, '')), '\s.*$', '')) >= 2
      then left(regexp_replace(trim(p_name), '\s.*$', ''), 60)
    else 'زبون'
  end;
$$;

-- --- What the review page needs ----------------------------------------------
-- Null for an unknown order or one that is not delivered yet. Returns no phone,
-- address or order ids. Lines whose variant was deleted cannot be traced to a
-- product and are skipped.
create or replace function public.review_context(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_token is null then
    return null;
  end if;

  select * into v_order from public.orders where public_token = p_token;
  if not found or v_order.status <> 'delivered' then
    return null;
  end if;

  return jsonb_build_object(
    'first_name', public.review_first_name(v_order.customer_name),
    'products', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'name', p.name,
          'slug', p.slug,
          'reviewed', exists (
            select 1 from public.review_orders ro
            where ro.order_id = v_order.id and ro.product_id = p.id
          )
        )
        order by p.name
      )
      from (
        select distinct pv.product_id
        from public.order_items oi
        join public.product_variants pv on pv.id = oi.variant_id
        where oi.order_id = v_order.id
      ) x
      join public.products p on p.id = x.product_id
    ), '[]'::jsonb)
  );
end;
$$;

-- --- Save the review ---------------------------------------------------------
-- Always stored unapproved (the existing trigger forces it too). The photo URL,
-- when given, must sit in this order's own folder of the review-photos bucket.
create or replace function public.submit_order_review(
  p_token uuid,
  p_product_id uuid,
  p_rating int,
  p_comment text,
  p_image_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_comment text := trim(coalesce(p_comment, ''));
  v_review_id uuid;
  v_photo_file text;
begin
  select * into v_order from public.orders where public_token = p_token;
  if not found or v_order.status <> 'delivered' then
    return jsonb_build_object('ok', false, 'code', 'not_delivered');
  end if;

  if not exists (
    select 1
    from public.order_items oi
    join public.product_variants pv on pv.id = oi.variant_id
    where oi.order_id = v_order.id and pv.product_id = p_product_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'not_in_order');
  end if;

  if exists (
    select 1 from public.review_orders ro
    where ro.order_id = v_order.id and ro.product_id = p_product_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_reviewed');
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object('ok', false, 'code', 'bad_rating');
  end if;

  if length(v_comment) < 3 or length(v_comment) > 2000 then
    return jsonb_build_object('ok', false, 'code', 'bad_comment');
  end if;

  -- The photo must be a file this order's buyer uploaded to this bucket: a
  -- Supabase storage address ending in review-photos/<token>/<file>, and that
  -- file must exist. Anything else (another website, a made-up name) is refused.
  if p_image_url is not null then
    v_photo_file := substring(
      p_image_url from (
        '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/review-photos/'
        || p_token::text || '/([A-Za-z0-9._-]+)$'
      )
    );
    if v_photo_file is null
       or length(p_image_url) > 500
       or not exists (
         select 1 from storage.objects so
         where so.bucket_id = 'review-photos'
           and so.name = p_token::text || '/' || v_photo_file
       )
    then
      return jsonb_build_object('ok', false, 'code', 'bad_photo');
    end if;
  end if;

  insert into public.reviews (product_id, customer_name, rating, comment, image_url)
  values (
    p_product_id,
    public.review_first_name(v_order.customer_name),
    p_rating,
    v_comment,
    p_image_url
  )
  returning id into v_review_id;

  insert into public.review_orders (review_id, order_id, product_id)
  values (v_review_id, v_order.id, p_product_id);

  return jsonb_build_object('ok', true);
exception
  -- A double tap that slipped past the check above: the first one won.
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'already_reviewed');
end;
$$;

-- --- Who may upload a photo --------------------------------------------------
-- A storage policy cannot read `orders` as an anonymous visitor, so this
-- security-definer helper answers one question: is this folder name the token
-- of a delivered order that still has a product nobody has reviewed? Once every
-- product is reviewed the folder closes, so a link that leaks later cannot be
-- used as free file hosting.
create or replace function public.is_review_upload_allowed(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders o
    where o.public_token::text = p_folder
      and o.status = 'delivered'
      and exists (
        select 1
        from public.order_items oi
        join public.product_variants pv on pv.id = oi.variant_id
        where oi.order_id = o.id
          and not exists (
            select 1 from public.review_orders ro
            where ro.order_id = o.id and ro.product_id = pv.product_id
          )
      )
  );
$$;

revoke all on function public.review_first_name(text)   from public;
revoke all on function public.review_context(uuid)     from public;
revoke all on function public.submit_order_review(uuid, uuid, int, text, text) from public;
revoke all on function public.is_review_upload_allowed(text) from public;
grant execute on function public.review_context(uuid)     to anon, authenticated;
grant execute on function public.submit_order_review(uuid, uuid, int, text, text) to anon, authenticated;
grant execute on function public.is_review_upload_allowed(text) to anon, authenticated;
-- review_first_name() needs no grant: the two functions above call it as their owner.

-- --- The photo bucket --------------------------------------------------------
-- Public read by address (an <img src> must work), but no SELECT policy, so the
-- folder cannot be listed. Writing is allowed only into the folder named after a
-- delivered order's token. Photos are small after the browser shrinks them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos', 'review-photos', true, 3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Delivered buyers upload review photos" on storage.objects;
create policy "Delivered buyers upload review photos"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'review-photos'
    and public.is_review_upload_allowed((storage.foldername(name))[1])
  );
