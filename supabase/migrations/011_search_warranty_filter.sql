-- 011_search_warranty_filter.sql
--
-- Adds a warranty floor to the public directory search.
--
-- WHY THIS DROPS AND RECREATES INSTEAD OF USING `create or replace`
--
-- `create or replace function` cannot add a parameter. Postgres identifies a
-- function by its argument types, so a "replacement" carrying a twelfth argument
-- is a *different* function: the eleven-argument original stays exactly where it
-- was and the two become overloads. That is not a cosmetic problem here.
-- PostgREST resolves an RPC by the set of argument *names* in the request body,
-- and every argument of both versions has a default — so a call naming only
-- `result_limit` (which is what `getFeaturedFixers` sends) matches both
-- candidates equally and Postgres raises "function is not unique". The homepage
-- and the whole directory would start returning 300s, from a migration that
-- looked like it only added a filter.
--
-- So: drop both possible signatures, then create one. Both drops are `if exists`
-- and the create is unconditional, which makes the file safe to re-run and safe
-- to run against a database where a previous attempt left either version behind.
--
-- This file must be applied as a single transaction — there is a moment between
-- the drop and the create where the function does not exist, and search is a
-- public page. `supabase db push` and `apply_migration` both wrap a migration in
-- one transaction, and DDL in Postgres is transactional, so no window is exposed.

drop function if exists public.search_fixers(
  double precision, double precision, double precision, double precision,
  text, text, numeric, boolean, boolean, boolean, integer
);

drop function if exists public.search_fixers(
  double precision, double precision, double precision, double precision,
  text, text, numeric, boolean, boolean, boolean, integer, integer
);

create function public.search_fixers(
  min_lat double precision default -90,
  max_lat double precision default 90,
  min_lng double precision default -180,
  max_lng double precision default 180,
  category_slug text default null,
  search_query text default null,
  min_rating numeric default 0,
  require_home_service boolean default false,
  require_pickup_drop boolean default false,
  require_in_shop boolean default false,
  result_limit integer default 100,
  -- Appended last, and defaulted, so any positional caller written against the
  -- previous signature keeps the meaning it had.
  min_warranty_days integer default 0
)
returns setof public.fixer_profiles
language sql
stable
set search_path to 'public'
as $function$
  select f.*
    from fixer_profiles f
   where f.is_hidden = false
     and f.suspended_at is null
     and (
       (f.lat between min_lat and max_lat and f.lng between min_lng and max_lng)
       or (
         f.lat is null
         and min_lat <= -90 and max_lat >= 90
         and min_lng <= -180 and max_lng >= 180
       )
     )
     and f.rating_avg >= min_rating
     -- `default_warranty_days` is `not null default 3`, so this needs no
     -- coalesce. At the default floor of 0 the predicate is universally true,
     -- which keeps an unfiltered search identical to what it returned before.
     and f.default_warranty_days >= min_warranty_days
     and (not require_home_service or f.offers_home_service)
     and (not require_pickup_drop  or f.offers_pickup_drop)
     and (not require_in_shop      or f.offers_in_shop)
     and (
       category_slug is null
       or exists (
         select 1
           from fixer_categories fc
           join repair_categories rc on rc.id = fc.category_id
          where fc.fixer_id = f.id and lower(rc.slug) = lower(category_slug)
       )
     )
     and (
       search_query is null
       or btrim(search_query) = ''
       or f.shop_name ilike '%' || btrim(search_query) || '%'
       or f.address   ilike '%' || btrim(search_query) || '%'
       or exists (
         select 1
           from fixer_categories fc
           join repair_categories rc on rc.id = fc.category_id
          where fc.fixer_id = f.id
            and rc.name ilike '%' || btrim(search_query) || '%'
       )
     )
   order by f.verified desc, f.rating_avg desc, f.rating_count desc
   limit least(greatest(result_limit, 1), 250);
$function$;

-- Dropping a function discards its ACL, so the grants have to be restated.
-- Recorded before the drop as:
--   {=X/postgres, postgres=X/postgres, anon=X/postgres,
--    authenticated=X/postgres, service_role=X/postgres}
-- `anon` is the one that matters most — the directory is a public page and an
-- unauthenticated visitor calls this function on every search. Losing that grant
-- would leave the site working for signed-in users and broken for everyone else,
-- which is the hardest kind of regression to notice.
grant execute on function public.search_fixers(
  double precision, double precision, double precision, double precision,
  text, text, numeric, boolean, boolean, boolean, integer, integer
) to anon, authenticated, service_role;
