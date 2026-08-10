-- ════════════════════════════════════════════════════════════════════════════
-- 002 — Expert-submitted shops
--
-- Until now every shop in the directory was seeded by us and every claim was
-- somebody asserting ownership of a shop that already existed. This migration
-- adds the other direction: an expert creates the shop row themselves, gets
-- their dashboard immediately, and the row stays out of the public directory
-- until an admin approves the claim attached to it.
--
-- The whole feature rests on one column. `is_hidden` is the difference between
-- "in the directory" and "exists but unreviewed", and because a missed filter
-- means an unvetted business appearing in Google, it is enforced in RLS and in
-- `search_fixers` rather than trusted to app code.
--
-- Safe to re-run. Every statement is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. The column ──────────────────────────────────────────────────────────
--
-- Defaults to true so that anything created from here on is invisible until
-- somebody decides otherwise — the safe direction for a default to fail in.
-- Existing rows are then flipped to false: they are the seeded directory and
-- were public before this ran, so leaving them hidden would empty the site.
--
-- The backfill is guarded on the column not having existed yet. Re-running the
-- migration must not un-hide shops submitted since the first run.
do $$
declare
  already_there boolean;
begin
  select exists (
    select 1
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'fixer_profiles'
       and a.attname = 'is_hidden'
       and a.attnum > 0
       and not a.attisdropped
  ) into already_there;

  alter table fixer_profiles
    add column if not exists is_hidden boolean not null default true;

  if not already_there then
    update fixer_profiles set is_hidden = false;
    raise notice 'is_hidden added; % existing shops kept public',
      (select count(*) from fixer_profiles);
  else
    raise notice 'is_hidden already present — backfill skipped';
  end if;
end;
$$;

comment on column fixer_profiles.is_hidden is
  'True while a shop awaits review. Hidden shops are absent from search, the '
  'sitemap and the public directory, and readable only by their owner. Set to '
  'false by shop_claims_apply() when a claim is approved.';

-- Partial index: every public read filters `is_hidden = false`, and the
-- visible set is the one that grows. Indexing only that half keeps it small.
create index if not exists fixer_profiles_visible_idx
  on fixer_profiles (rating_avg desc, rating_count desc)
  where is_hidden = false;

-- ─── 2. Approval publishes the shop ─────────────────────────────────────────
--
-- `create or replace`, not drop-and-recreate: the trigger below already points
-- at this function by name, so replacing the body leaves the binding intact.
--
-- One subtlety about `is_hidden = false` here. This is a BEFORE UPDATE trigger
-- on shop_claims, and it issues an UPDATE against a *different* table, so the
-- assignment cannot go on NEW — it has to be part of the fixer_profiles write.
-- It is set unconditionally rather than only when hidden: an approved shop is
-- public by definition, and a no-op write on an already-visible row is free.
create or replace function shop_claims_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update fixer_profiles
       set owner_id  = new.user_id,
           is_hidden = false
     where id = new.fixer_id;

    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;

  return new;
end;
$$;

comment on function shop_claims_apply() is
  'On approval: assigns ownership and publishes the shop. The only writer of '
  'fixer_profiles.owner_id — approveClaim() in the admin app deliberately does '
  'not set it, to avoid two uncoordinated writers on one column.';

-- ─── 3. Hidden shops are invisible to the public, visible to their owner ────
--
-- This replaces `using (true)`, and it is the load-bearing half of the feature.
-- The app reads fixer_profiles from a dozen places; one forgotten `.eq()` in any
-- of them would publish an unvetted business. Enforcing it here means a missed
-- filter returns nothing instead of leaking.
--
-- The second disjunct is what lets an owner preview their own pending shop at
-- its real public URL while everyone else gets a 404 — no separate preview
-- route, and no `is_hidden` special-casing in the page itself.
--
-- Note this does NOT protect the sitemap: `getAllExpertSlugs` uses the service
-- role client, which bypasses RLS entirely. That one is filtered in TypeScript.
drop policy if exists "Public fixer profiles" on fixer_profiles;
drop policy if exists "profiles readable by all" on fixer_profiles;
drop policy if exists "visible shops readable by all" on fixer_profiles;

create policy "visible shops readable by all"
  on fixer_profiles for select
  using (
    is_hidden = false
    or owner_id = (select auth.uid())
  );

-- ─── 4. `search_fixers` never returns a hidden shop ─────────────────────────
--
-- The function is `security invoker` and `stable`, so the policy above already
-- filters it for anon callers. The predicate is added anyway, for the case that
-- actually bites: a *signed-in owner* searching the public directory would
-- otherwise find their own unapproved shop ranked among the real results, and
-- could book themselves through a flow that is supposed to be unreachable.
--
-- Body is otherwise byte-identical to 001's. Only the one line is new.
create or replace function search_fixers(
  min_lat              double precision default -90,
  max_lat              double precision default 90,
  min_lng              double precision default -180,
  max_lng              double precision default 180,
  category_slug        text default null,
  search_query         text default null,
  min_rating           numeric default 0,
  require_home_service boolean default false,
  require_pickup_drop  boolean default false,
  require_in_shop      boolean default false,
  result_limit         integer default 100
)
returns setof fixer_profiles
language sql
stable
as $$
  select f.*
    from fixer_profiles f
   where f.is_hidden = false
     and (
       -- A shop with no coordinates can't be placed on the map, so it only
       -- surfaces when the caller hasn't narrowed to a viewport.
       (f.lat between min_lat and max_lat and f.lng between min_lng and max_lng)
       or (
         f.lat is null
         and min_lat <= -90 and max_lat >= 90
         and min_lng <= -180 and max_lng >= 180
       )
     )
     and f.rating_avg >= min_rating
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
       -- ilike beats trigram similarity for the prefix-ish queries people
       -- actually type ("acme", "north st"); the trgm index still serves it.
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
$$;

-- ─── 5. Evidence bucket ─────────────────────────────────────────────────────
--
-- Private, and it has to stay that way: submissions carry photographs of
-- business licences and shopfronts, which is somebody's identity documentation.
-- A public bucket would put those behind a guessable URL forever.
--
-- Files are addressed as `<user_id>/<claim-ish>/<file>`, so the first path
-- segment is the owner and the policies below can compare it to auth.uid()
-- without a lookup. Reads for the admin panel go through the service-role
-- client, which bypasses these entirely.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-claims-evidence',
  'shop-claims-evidence',
  false,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "claimant uploads own evidence" on storage.objects;
create policy "claimant uploads own evidence"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'shop-claims-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "claimant reads own evidence" on storage.objects;
create policy "claimant reads own evidence"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'shop-claims-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Replacing a mis-uploaded file needs UPDATE alongside INSERT and SELECT;
-- without it an upsert silently fails on the second attempt.
drop policy if exists "claimant replaces own evidence" on storage.objects;
create policy "claimant replaces own evidence"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'shop-claims-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'shop-claims-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

