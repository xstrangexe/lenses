-- =============================================================================
-- Checks for supabase/track-by-phone.sql. Run it AFTER that file.
--
-- It reads your real orders and never changes them. It writes a few rows to
-- phone_lookup_log and deletes them again before showing the result. The last
-- table has one row per check; every row must say pass = true.
-- Running it twice within 10 minutes can show a rate-limit false alarm on the
-- "spellings match" row: wait 10 minutes and run it again.
-- Delete any saved query text in the editor before pasting this.
-- =============================================================================

-- Every call below counts as this one made-up visitor, and is deleted at the end.
select set_config('request.headers', '{"x-real-ip":"verify-ip"}', false);
delete from public.phone_lookup_log where ip_hash = md5('verify-ip');

create temp table if not exists _r (n serial, check_name text, expected text, actual text);
truncate _r;

-- 1. bad numbers are refused before anything is looked up
insert into _r (check_name, expected, actual)
values ('letters are invalid', 'invalid_phone', public.lookup_orders_by_phone('abc') ->> 'code'),
       ('landline is invalid', 'invalid_phone', public.lookup_orders_by_phone('021 12 34 56') ->> 'code'),
       ('too short is invalid', 'invalid_phone', public.lookup_orders_by_phone('0555 12') ->> 'code'),
       ('null is invalid', 'invalid_phone', public.lookup_orders_by_phone(null) ->> 'code');

-- 2. every spelling of one real number gives the same answer
create temp table if not exists _p (phone text);
truncate _p;
insert into _p select public.canonical_dz_phone(phone) from public.orders
  where public.canonical_dz_phone(phone) ~ '^0[5-7][0-9]{8}$' order by created_at desc limit 1;

insert into _r (check_name, expected, actual)
select 'a real number has orders', 'true',
       (select (jsonb_array_length(public.lookup_orders_by_phone(phone) -> 'orders') > 0)::text from _p)
from _p;

insert into _r (check_name, expected, actual)
select 'spaced, +213 and 00213 spellings match the 0 spelling', 'true',
       ((public.lookup_orders_by_phone(substr(phone,1,4) || ' ' || substr(phone,5,2) || ' ' || substr(phone,7)) -> 'orders')
          = (public.lookup_orders_by_phone('+213' || substr(phone,2)) -> 'orders')
        and (public.lookup_orders_by_phone('00213' || substr(phone,2)) -> 'orders')
          = (public.lookup_orders_by_phone('+213-' || substr(phone,2)) -> 'orders'))::text
from _p;

-- 3. the answer leaks nothing private
insert into _r (check_name, expected, actual)
select 'no phone, address, id or token in the answer', 'false',
       (public.lookup_orders_by_phone(phone)::text ~* '"(address|phone|commune|public_token|token|id)":')::text
from _p;

-- 4. an unknown number is an empty list, not an error
insert into _r (check_name, expected, actual)
values ('unknown number gives empty list', '0',
        jsonb_array_length(public.lookup_orders_by_phone('0500000001') -> 'orders')::text);

-- 5. names are masked
insert into _r (check_name, expected, actual)
values ('mask: two words', 'Karim B.', public.track_masked_name('Karim  Benali')),
       ('mask: one word', 'Karim', public.track_masked_name('Karim')),
       ('mask: blank', 'زبون', public.track_masked_name('   '));

-- 6. anon cannot read orders or the log directly
insert into _r (check_name, expected, actual)
values ('anon has no table access on orders', 'false',
        has_table_privilege('anon', 'public.orders', 'select')::text),
       ('anon has no table access on phone_lookup_log', 'false',
        has_table_privilege('anon', 'public.phone_lookup_log', 'select')::text),
       ('anon may run lookup_orders_by_phone', 'true',
        has_function_privilege('anon', 'public.lookup_orders_by_phone(text)', 'execute')::text);

-- 7. the per-IP "found nothing" limit (8) trips, with a wait time
do $$
begin
  for i in 1..8 loop
    perform public.lookup_orders_by_phone('05' || lpad(i::text, 8, '0'));
  end loop;
end $$;
insert into _r (check_name, expected, actual)
values ('9th miss from one IP is rate limited', 'rate_limited',
        public.lookup_orders_by_phone('0500000099') ->> 'code'),
       ('the refusal says how long to wait', 'true',
        ((public.lookup_orders_by_phone('0500000099') ->> 'retry_after')::int > 0)::text);

delete from public.phone_lookup_log where ip_hash = md5('verify-ip');

select n, check_name, expected, actual, (expected = actual) as pass from _r order by n;
