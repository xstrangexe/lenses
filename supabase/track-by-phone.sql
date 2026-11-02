-- =============================================================================
-- Track an order by phone number: the customer types the number they used at
-- checkout and sees their orders (newest first), status and carrier timeline.
--
-- ADDITIVE ONLY. This file adds one table and two functions. It changes no
-- existing table, trigger, policy or function, so it cannot touch products,
-- orders or reviews. Running it twice is safe. To undo it completely, run
-- supabase/track-by-phone-rollback.sql.
--
-- BEFORE YOU RUN IT (Supabase dashboard -> SQL Editor):
--   1. The editor may open on a SAVED QUERY that deletes all products (the old
--      catalogue import). Select all and DELETE its text first, then paste this
--      file. Never press Run while that text is in the editor.
--   2. Paste this whole file, press Run. Expect "Success. No rows returned".
--   3. Then run supabase/track-by-phone-verify.sql (it changes no real data).
--
-- Privacy, in the same spirit as track_order() and review_context():
--   * anon has NO access to orders; the only door is lookup_orders_by_phone().
--   * The answer holds no address, no phone, no commune, no order id and NO
--     order token (the token opens the full page with the address, so a phone
--     number must never hand it out). Only: masked name ("Karim B."), wilaya,
--     status, date, products, total, carrier and carrier tracking number.
--   * Numbers cannot be probed in bulk: every call is logged and limited per
--     phone number, per IP and for the whole shop (see below).
-- =============================================================================

-- --- The lookup log (rate limiting) -------------------------------------------
-- Holds only md5 hashes, never the phone itself. Private to the function below
-- and to admins; rows older than a day are deleted by the function itself.
create table if not exists public.phone_lookup_log (
  id         bigint generated always as identity primary key,
  logged_at  timestamptz not null default now(),
  ip_hash    text not null,
  phone_hash text not null,
  hit        boolean not null
);

create index if not exists phone_lookup_log_at_idx    on public.phone_lookup_log (logged_at);
create index if not exists phone_lookup_log_ip_idx    on public.phone_lookup_log (ip_hash, logged_at);
create index if not exists phone_lookup_log_phone_idx on public.phone_lookup_log (phone_hash, logged_at);

alter table public.phone_lookup_log enable row level security;

drop policy if exists "Admins read phone lookup log" on public.phone_lookup_log;
create policy "Admins read phone lookup log"
  on public.phone_lookup_log for select to authenticated
  using ((select public.has_admin_role((select auth.uid()), array['owner','staff']::public.admin_role[])) is true);

-- Supabase grants anon every new public table by default; take that back.
revoke all on public.phone_lookup_log from anon, authenticated;
grant select on public.phone_lookup_log to authenticated;

-- --- Masked name ----------------------------------------------------------------
-- "Karim Benali" -> "Karim B." ; one word stays as it is ; nothing more shows.
create or replace function public.track_masked_name(p_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(array_length(w, 1), 0) = 0 or w[1] = '' then 'زبون'
    when array_length(w, 1) = 1 then left(w[1], 30)
    else left(w[1], 30) || ' ' || left(w[array_length(w, 1)], 1) || '.'
  end
  from (select regexp_split_to_array(trim(coalesce(p_name, '')), '\s+') as w) s;
$$;

-- --- The lookup -----------------------------------------------------------------
-- Input: any spelling of an Algerian mobile number (05.., 06.., 07.., +213..,
-- 00213.., spaces and dashes). Output, always jsonb:
--   {"ok": false, "code": "invalid_phone"}
--   {"ok": false, "code": "rate_limited", "retry_after": <seconds>}
--   {"ok": true,  "orders": []}                  -- nothing for this number
--   {"ok": true,  "orders": [ {order}, ... ]}    -- newest first, at most 10
--
-- Limits (rolling 10 minutes). Change the numbers here if real customers hit them:
--   per phone number   10 lookups   (stops hammering one victim)
--   per IP             20 lookups, of which at most 8 may find nothing
--   whole shop         300 lookups, of which at most 100 may find nothing
-- A refused call is not logged, so the log cannot be flooded by refusals.
create or replace function public.lookup_orders_by_phone(p_phone text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_window   constant interval := interval '10 minutes';
  v_digits   text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_local    text;
  v_headers  json;
  v_ip       text;
  v_ip_hash  text;
  v_ph_hash  text;
  v_since    timestamptz := now() - c_window;
  v_oldest   timestamptz;
  v_wait     int;
  v_orders   jsonb;
begin
  if length(v_digits) > 20 then
    return jsonb_build_object('ok', false, 'code', 'invalid_phone');
  end if;

  -- 00213 / +213 / 213 -> 0, then it must be a mobile number: 05, 06 or 07.
  v_local := regexp_replace(v_digits, '^(\+|00)?213', '0');
  if v_local !~ '^0[5-7][0-9]{8}$' then
    return jsonb_build_object('ok', false, 'code', 'invalid_phone');
  end if;

  -- The caller's address as the API gateway saw it. A missing header falls back
  -- to one shared bucket, which is stricter, not looser.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ip := coalesce(
    nullif(trim(v_headers ->> 'cf-connecting-ip'), ''),
    nullif(trim(v_headers ->> 'x-real-ip'), ''),
    nullif(trim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    'unknown'
  );
  v_ip_hash := md5(v_ip);
  v_ph_hash := md5(v_local);

  -- Old rows are dropped here so the table stays small without a scheduled job.
  delete from public.phone_lookup_log where logged_at < now() - interval '1 day';

  -- Serialise one caller's check-then-log, so a burst of parallel calls cannot
  -- all pass the limit before any of them is counted.
  perform pg_advisory_xact_lock(hashtextextended('lookup_orders_by_phone:' || v_ip_hash, 0));

  if (select count(*) from public.phone_lookup_log where phone_hash = v_ph_hash and logged_at > v_since) >= 10
     or (select count(*) from public.phone_lookup_log where ip_hash = v_ip_hash and logged_at > v_since) >= 20
     or (select count(*) from public.phone_lookup_log where ip_hash = v_ip_hash and not hit and logged_at > v_since) >= 8
     or (select count(*) from public.phone_lookup_log where logged_at > v_since) >= 300
     or (select count(*) from public.phone_lookup_log where not hit and logged_at > v_since) >= 100
  then
    select min(logged_at) into v_oldest from public.phone_lookup_log
      where logged_at > v_since and (ip_hash = v_ip_hash or phone_hash = v_ph_hash);
    v_wait := greatest(1, ceil(extract(epoch from (coalesce(v_oldest, now()) + c_window - now())))::int);
    return jsonb_build_object('ok', false, 'code', 'rate_limited', 'retry_after', v_wait);
  end if;

  select coalesce(jsonb_agg(o.j order by o.created_at desc), '[]'::jsonb)
    into v_orders
  from (
    select ord.created_at,
           jsonb_build_object(
             'name',            public.track_masked_name(ord.customer_name),
             'wilaya',          ord.wilaya,
             'status',          ord.status,
             'carrier',         ord.carrier,
             'tracking_number', ord.tracking_number,
             'total',           ord.total,
             'created_at',      ord.created_at,
             'items', coalesce((
               select jsonb_agg(jsonb_build_object(
                 'product_name',  oi.product_name,
                 'variant_label', oi.variant_label,
                 'quantity',      oi.quantity,
                 'unit_price',    oi.unit_price
               ) order by oi.created_at)
               from public.order_items oi
               where oi.order_id = ord.id
             ), '[]'::jsonb)
           ) as j
    from public.orders ord
    where public.canonical_dz_phone(ord.phone) = v_local
    order by ord.created_at desc
    limit 10
  ) o;

  insert into public.phone_lookup_log (ip_hash, phone_hash, hit)
  values (v_ip_hash, v_ph_hash, jsonb_array_length(v_orders) > 0);

  return jsonb_build_object('ok', true, 'orders', v_orders);
end;
$$;

revoke all on function public.track_masked_name(text)       from public;
revoke all on function public.lookup_orders_by_phone(text)  from public;
grant execute on function public.lookup_orders_by_phone(text) to anon, authenticated;
-- track_masked_name() needs no grant: lookup_orders_by_phone() calls it as its owner.
