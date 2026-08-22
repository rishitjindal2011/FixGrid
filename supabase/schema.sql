-- ════════════════════════════════════════════════════════════════════════════
-- FixGrid — schema
--
-- Run order:  schema.sql  →  policies.sql  →  seed.sql (optional)
-- Idempotent: safe to re-run, on a fresh database or one several revisions old.
--
-- ─── Why this file is ordered in phases ─────────────────────────────────────
--
-- `create table if not exists` skips an existing table *wholesale*. It does not
-- compare definitions, so on a database provisioned from an older revision the
-- create is a silent no-op and every column added since is simply missing. The
-- same is true of `create unique index if not exists`, which matches on the
-- index NAME rather than its definition.
--
-- That makes ordering load-bearing. An index, constraint, trigger, function or
-- insert that mentions a column will fail with 42703 if the reconciliation that
-- adds that column has not run yet — and the failure aborts the rest of the
-- file. So this is grouped into phases rather than table by table:
--
--   1. Tables          — bare `create table if not exists`, nothing else
--   2. Columns         — every column reconciled, defaults restored, legacy
--                        NOT NULLs relaxed. After this phase the shape of every
--                        table is known-good.
--   3. Constraints     — table-level checks and unique indexes
--   4. Indexes         — plain lookup indexes
--   5. Functions       — triggers and read-side helpers
--   6. Rows            — the backfills and the singleton settings row
--
-- Nothing in a later phase is safe in an earlier one. Adding a statement to the
-- wrong phase is how the `seo_redirects.hit_count` and `fixer_profiles.updated_at`
-- failures happened.
--
-- ─── Deviations from the original spec, and why ─────────────────────────────
--   • `timezone` on fixer_profiles. Open/closed cannot be computed correctly
--     from naked TIME columns without knowing the shop's zone. The old design
--     silently used server time.
--   • `rating_avg` / `rating_count` denormalised onto fixer_profiles and kept
--     current by trigger. Search sorts and filters by rating; recomputing an
--     aggregate per request across reviews does not scale past a few thousand
--     rows.
--   • Join table `fixer_categories` made explicit (the spec said "many-to-many"
--     without naming it).
--   • UNIQUE (path_prefix, slug) on seo_pages. Slug alone being unique makes
--     /guides/screen-repair and /services/screen-repair collide.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy shop-name search
create extension if not exists "citext";     -- case-insensitive email

-- ─── Enums ──────────────────────────────────────────────────────────────────

do $$ begin
  create type page_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type admin_role as enum ('viewer', 'editor', 'owner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type weekday as enum ('mon','tue','wed','thu','fri','sat','sun');
exception when duplicate_object then null; end $$;

-- Note: no `alter type ... add value` reconciliation here on purpose. A value
-- added inside a transaction cannot be *used* until that transaction commits,
-- and the SQL Editor runs this whole file as one — so the repair would break
-- the phases that follow it. An enum genuinely missing a value needs its own
-- run, on its own.


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 1 — Tables
--
-- Bare creates only. No indexes, constraints beyond the primary key, triggers
-- or inserts, because none of those are safe until phase 2 has reconciled the
-- columns they depend on. Order matters here only for foreign keys.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists users (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null default 'Customer',
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Foreign keys that phase 3 also adds by name are deliberately left off the
-- creates below: an inline `references` is auto-named `<table>_<col>_fkey`, so
-- declaring it in both places leaves a fresh database carrying two identical
-- constraints under different names.
create table if not exists fixer_profiles (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid,

  slug        text not null,
  shop_name   text not null,
  bio         text,

  -- Location
  address     text not null,
  lat         double precision,
  lng         double precision,
  timezone    text not null default 'Asia/Kolkata',

  -- Trust
  verified    boolean not null default false,
  photos      text[] not null default '{}',

  -- Service model
  offers_in_shop      boolean not null default true,
  offers_home_service boolean not null default false,
  offers_pickup_drop  boolean not null default false,

  -- Operating hours. working_days + opening_time/closing_time are the base
  -- schedule; `hours` optionally overrides individual days, shape:
  --   { "sat": { "open": "10:00", "close": "14:00" }, "sun": null }
  -- A null value means explicitly closed that day.
  working_days       weekday[] not null default '{mon,tue,wed,thu,fri}',
  opening_time       time not null default '09:00',
  closing_time       time not null default '18:00',
  hours              jsonb not null default '{}'::jsonb,
  closed_on_holidays boolean not null default true,

  -- Contact
  contact_phone text,
  contact_email citext,

  -- Denormalised review aggregate (trigger-maintained; never write by hand)
  rating_avg   numeric(2,1) not null default 0,
  rating_count integer      not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists repair_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null,
  description text,
  icon        text,           -- lucide-react icon name
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists fixer_categories (
  fixer_id    uuid not null references fixer_profiles (id)    on delete cascade,
  category_id uuid not null references repair_categories (id) on delete cascade,
  primary key (fixer_id, category_id)
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  fixer_id    uuid not null references fixer_profiles (id) on delete cascade,
  customer_id uuid not null references auth.users (id)     on delete cascade,
  rating      integer not null,
  text        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists shop_jobs (
  id                  uuid primary key default gen_random_uuid(),
  fixer_id            uuid not null references fixer_profiles (id) on delete cascade,
  title               text not null,
  job_type            job_type not null default 'full_time',
  work_location       work_location not null default 'in_shop',
  experience_level    text not null default 'any',
  salary_type         salary_type not null default 'negotiable',
  salary_min          integer,
  salary_max          integer,
  salary_period       salary_period not null default 'month',
  salary_negotiable   boolean not null default true,
  description         text not null,
  skills_required     text[] not null default '{}',
  contact_phone       text,
  contact_whatsapp    text,
  contact_email       citext,
  is_active           boolean not null default true,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists seo_global (
  id                       integer primary key default 1,
  site_title               text not null default 'FixGrid',
  default_meta_title       text not null default 'FixGrid — find a repair expert near you',
  default_meta_description text not null default 'Verified local repair experts for phones, appliances, bikes and more.',
  default_keywords         text[] not null default '{}',
  canonical_domain         text not null default 'https://www.vytron.me',
  default_og_image_url     text,
  updated_at               timestamptz not null default now()
);

create table if not exists cms_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null,
  -- Default blueprint: an array of section blocks copied into new pages.
  sections   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists seo_pages (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid,

  title       text not null,
  slug        text not null,
  -- '' = site root level; otherwise 'services' or 'guides/appliances'
  path_prefix text not null default '',
  status      page_status not null default 'draft',

  content_sections jsonb not null default '[]'::jsonb,

  -- Core SEO
  meta_title       text,
  meta_description text,
  keywords         text[] not null default '{}',
  canonical_url    text,
  is_indexed       boolean not null default true,
  is_followed      boolean not null default true,

  -- Social + structured data
  og_title      text,
  og_image_url  text,
  schema_type   text not null default 'WebPage',
  schema_markup jsonb,

  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists seo_redirects (
  id              uuid primary key default gen_random_uuid(),
  source_url      text not null,
  destination_url text not null,
  status_code     integer not null default 301,
  hit_count       integer not null default 0,
  created_at      timestamptz not null default now()
);

-- Admin auth (App 2, local to the dashboard).
create table if not exists seo_admins (
  id            uuid primary key default gen_random_uuid(),
  email         citext not null,
  password_hash text not null,
  role          admin_role not null default 'editor',
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 2 — Columns
--
-- Everything above is a no-op on a database that already has the table. This
-- phase is what actually brings an older one up to date, and it runs before any
-- statement that names a column.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 2a. Optional columns ───────────────────────────────────────────────────
--
-- Nullable, or NOT NULL with a default. Both are safe to add to a table that
-- already holds rows: the default backfills them. `users.display_name`,
-- `repair_categories.sort_order`, `fixer_profiles.updated_at` and
-- `seo_redirects.hit_count` were each found missing on the live database, in
-- that order, one deployment at a time — so every column of this kind is listed
-- here rather than only the ones that have bitten so far.

alter table users add column if not exists display_name text not null default 'Customer';
alter table users add column if not exists avatar_url   text;
alter table users add column if not exists created_at   timestamptz not null default now();

alter table fixer_profiles add column if not exists owner_id            uuid;
alter table fixer_profiles add column if not exists bio                 text;
alter table fixer_profiles add column if not exists lat                 double precision;
alter table fixer_profiles add column if not exists lng                 double precision;
alter table fixer_profiles add column if not exists timezone            text not null default 'Asia/Kolkata';
alter table fixer_profiles add column if not exists verified            boolean not null default false;
alter table fixer_profiles add column if not exists photos              text[] not null default '{}';
alter table fixer_profiles add column if not exists offers_in_shop      boolean not null default true;
alter table fixer_profiles add column if not exists offers_home_service boolean not null default false;
alter table fixer_profiles add column if not exists offers_pickup_drop  boolean not null default false;
alter table fixer_profiles add column if not exists working_days        weekday[] not null default '{mon,tue,wed,thu,fri}';
alter table fixer_profiles add column if not exists opening_time        time not null default '09:00';
alter table fixer_profiles add column if not exists closing_time        time not null default '18:00';
alter table fixer_profiles add column if not exists hours               jsonb not null default '{}'::jsonb;
alter table fixer_profiles add column if not exists closed_on_holidays  boolean not null default true;
alter table fixer_profiles add column if not exists contact_phone       text;
alter table fixer_profiles add column if not exists contact_email       citext;
alter table fixer_profiles add column if not exists rating_avg          numeric(2,1) not null default 0;
alter table fixer_profiles add column if not exists rating_count        integer not null default 0;
alter table fixer_profiles add column if not exists created_at          timestamptz not null default now();
alter table fixer_profiles add column if not exists updated_at          timestamptz not null default now();

alter table repair_categories add column if not exists description text;
alter table repair_categories add column if not exists icon        text;
alter table repair_categories add column if not exists sort_order  integer not null default 0;
alter table repair_categories add column if not exists created_at  timestamptz not null default now();

alter table reviews add column if not exists text       text;
alter table reviews add column if not exists created_at timestamptz not null default now();
alter table reviews add column if not exists updated_at timestamptz not null default now();

alter table seo_global add column if not exists site_title               text not null default 'FixGrid';
alter table seo_global add column if not exists default_meta_title       text not null default 'FixGrid — find a repair expert near you';
alter table seo_global add column if not exists default_meta_description text not null default 'Verified local repair experts for phones, appliances, bikes and more.';
alter table seo_global add column if not exists default_keywords         text[] not null default '{}';
alter table seo_global add column if not exists canonical_domain         text not null default 'https://www.vytron.me';
alter table seo_global add column if not exists default_og_image_url     text;
alter table seo_global add column if not exists updated_at               timestamptz not null default now();

alter table cms_templates add column if not exists sections   jsonb not null default '[]'::jsonb;
alter table cms_templates add column if not exists created_at timestamptz not null default now();
alter table cms_templates add column if not exists updated_at timestamptz not null default now();

alter table seo_pages add column if not exists template_id      uuid;
alter table seo_pages add column if not exists path_prefix      text not null default '';
alter table seo_pages add column if not exists status           page_status not null default 'draft';
alter table seo_pages add column if not exists content_sections jsonb not null default '[]'::jsonb;
alter table seo_pages add column if not exists meta_title       text;
alter table seo_pages add column if not exists meta_description text;
alter table seo_pages add column if not exists keywords         text[] not null default '{}';
alter table seo_pages add column if not exists canonical_url    text;
alter table seo_pages add column if not exists is_indexed       boolean not null default true;
alter table seo_pages add column if not exists is_followed      boolean not null default true;
alter table seo_pages add column if not exists og_title         text;
alter table seo_pages add column if not exists og_image_url     text;
alter table seo_pages add column if not exists schema_type      text not null default 'WebPage';
alter table seo_pages add column if not exists schema_markup    jsonb;
alter table seo_pages add column if not exists published_at     timestamptz;
alter table seo_pages add column if not exists created_at       timestamptz not null default now();
alter table seo_pages add column if not exists updated_at       timestamptz not null default now();

alter table seo_redirects add column if not exists status_code integer not null default 301;
alter table seo_redirects add column if not exists hit_count   integer not null default 0;
alter table seo_redirects add column if not exists created_at  timestamptz not null default now();

alter table seo_admins add column if not exists role          admin_role not null default 'editor';
alter table seo_admins add column if not exists last_login_at timestamptz;
alter table seo_admins add column if not exists created_at    timestamptz not null default now();

-- ─── 2b. Required columns ───────────────────────────────────────────────────
--
-- NOT NULL with no sensible default. These cannot be added blindly: on a table
-- that already holds rows the ALTER fails, and inventing a default ('' for a
-- shop name) would put nonsense in a user-visible field.
--
-- Earlier revisions of this file simply omitted them and documented that "a
-- table missing these is a different table". That is true, and it is also a
-- 42703 in the middle of the migration with no explanation attached. So handle
-- both cases explicitly: on an empty table add the column as NOT NULL, and on a
-- populated one add it nullable and say loudly what needs backfilling. Either
-- way the rest of the file runs.

do $$
declare
  req record;
  rows_present bigint;
begin
  for req in
    select * from (values
      ('fixer_profiles',   'slug',            'text'),
      ('fixer_profiles',   'shop_name',       'text'),
      ('fixer_profiles',   'address',         'text'),
      ('repair_categories','name',            'text'),
      ('repair_categories','slug',            'text'),
      ('reviews',          'rating',          'integer'),
      ('cms_templates',    'name',            'text'),
      ('cms_templates',    'slug',            'text'),
      ('seo_pages',        'title',           'text'),
      ('seo_pages',        'slug',            'text'),
      ('seo_redirects',    'source_url',      'text'),
      ('seo_redirects',    'destination_url', 'text'),
      ('seo_admins',       'email',           'citext'),
      ('seo_admins',       'password_hash',   'text')
    ) as t(tbl, col, typ)
  loop
    continue when exists (
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name   = req.tbl
         and column_name  = req.col
    );

    execute format('select count(*) from public.%I', req.tbl) into rows_present;

    if rows_present = 0 then
      execute format('alter table public.%I add column %I %s not null',
                     req.tbl, req.col, req.typ);
      raise notice 'Added required column %.% (table was empty).', req.tbl, req.col;
    else
      execute format('alter table public.%I add column %I %s',
                     req.tbl, req.col, req.typ);
      raise warning
        'Added %.% as NULLABLE — the table already holds % row(s) and this column is required. Backfill it, then run: alter table %.% alter column % set not null;',
        req.tbl, req.col, rows_present, 'public', req.tbl, req.col;
    end if;
  end loop;
end $$;

-- ─── 2c. seo_global.id: uuid → integer ──────────────────────────────────────
--
-- Older deployments created this as a uuid. The singleton insert in phase 6
-- then fails with "column id is of type uuid but expression is of type
-- integer". A column type cannot be changed with `if not exists`, and a bare
-- ALTER would error on a fresh database where it is already integer — so test
-- the catalog and only rewrite when necessary.

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'seo_global'
       and column_name  = 'id'
       and data_type    = 'uuid'
  ) then
    -- Every row is about to collapse onto id = 1, so keep only the most
    -- recently updated one or the primary key cannot be rebuilt.
    delete from seo_global
     where id not in (
       select id from seo_global order by updated_at desc nulls last limit 1
     );

    alter table seo_global alter column id drop default;
    alter table seo_global drop constraint if exists seo_global_id_check;
    alter table seo_global alter column id type integer using 1;
    alter table seo_global alter column id set default 1;

    raise notice 'Rewrote seo_global.id from uuid to integer.';
  end if;
end $$;

-- ─── 2d. Defaults ───────────────────────────────────────────────────────────
--
-- `add column if not exists` is a no-op when the column is already there, which
-- means a column that predates its default never acquires one. That matters
-- twice: inserts omitting it fail, and 2e below would read it as a legacy
-- column and quietly drop its NOT NULL. `set default` is idempotent, and every
-- column named here is guaranteed to exist by 2a/2b.

alter table users alter column display_name set default 'Customer';
alter table users alter column created_at   set default now();

alter table fixer_profiles alter column timezone            set default 'Asia/Kolkata';
alter table fixer_profiles alter column verified            set default false;
alter table fixer_profiles alter column photos              set default '{}';
alter table fixer_profiles alter column offers_in_shop      set default true;
alter table fixer_profiles alter column offers_home_service set default false;
alter table fixer_profiles alter column offers_pickup_drop  set default false;
alter table fixer_profiles alter column working_days        set default '{mon,tue,wed,thu,fri}';
alter table fixer_profiles alter column opening_time        set default '09:00';
alter table fixer_profiles alter column closing_time        set default '18:00';
alter table fixer_profiles alter column hours               set default '{}'::jsonb;
alter table fixer_profiles alter column closed_on_holidays  set default true;
alter table fixer_profiles alter column rating_avg          set default 0;
alter table fixer_profiles alter column rating_count        set default 0;
alter table fixer_profiles alter column created_at          set default now();
alter table fixer_profiles alter column updated_at          set default now();

alter table repair_categories alter column sort_order set default 0;
alter table repair_categories alter column created_at set default now();

alter table reviews alter column created_at set default now();
alter table reviews alter column updated_at set default now();

-- ─── Repair: keywords columns that were created as `text` ───────────────────
--
-- `add column if not exists` matches on NAME only and never inspects the type,
-- so a database provisioned while these columns were plain `text` keeps a
-- `text` column forever no matter how many times this file is re-run. PostgREST
-- then hands the admin a bare string where it expects an array, which is what
-- produced `page?.keywords.join is not a function` in the page editor.
--
-- This must run BEFORE the `set default '{}'` statements below: on a text
-- column that default is the two-character string "{}", not an empty array,
-- which entrenches the bad shape instead of fixing it.
do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('seo_pages',  'keywords'),
      ('seo_global', 'default_keywords')
    ) as t(table_name, column_name)
  loop
    if exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name   = target.table_name
        and c.column_name  = target.column_name
        and c.data_type in ('text', 'character varying')
    ) then
      -- Drop the default first: a `text` default cannot survive the retype.
      execute format('alter table %I alter column %I drop default', target.table_name, target.column_name);

      -- Accepts all three shapes seen in the wild: a Postgres array literal
      -- ({a,b}, possibly with quoted members), a comma-separated list typed by
      -- a human, and null/empty. Blank members are dropped rather than becoming
      -- empty-string keywords.
      --
      -- Written without a sub-select on purpose: a USING transform expression
      -- may not contain one, so the per-element trim is done by normalising the
      -- separators first and then array_remove'ing what is left over.
      execute format($fmt$
        alter table %I alter column %I type text[] using
          case
            when coalesce(btrim(%I), '') = '' then '{}'::text[]
            when btrim(%I) like '{%%}'        then btrim(%I)::text[]
            else array_remove(
                   string_to_array(
                     btrim(regexp_replace(%I, '\s*,\s*', ',', 'g'), ', '),
                     ','
                   ),
                   ''
                 )
          end
      $fmt$, target.table_name, target.column_name, target.column_name,
             target.column_name, target.column_name, target.column_name);

      execute format('update %I set %I = ''{}'' where %I is null', target.table_name, target.column_name, target.column_name);
      execute format('alter table %I alter column %I set not null', target.table_name, target.column_name);

      raise notice 'repaired %.% -> text[]', target.table_name, target.column_name;
    end if;
  end loop;
end $$;

alter table seo_global alter column id                       set default 1;
alter table seo_global alter column site_title               set default 'FixGrid';
alter table seo_global alter column default_meta_title       set default 'FixGrid — find a repair expert near you';
alter table seo_global alter column default_meta_description set default 'Verified local repair experts for phones, appliances, bikes and more.';
alter table seo_global alter column default_keywords         set default '{}';
alter table seo_global alter column canonical_domain         set default 'https://www.vytron.me';
alter table seo_global alter column updated_at               set default now();

alter table cms_templates alter column sections   set default '[]'::jsonb;
alter table cms_templates alter column created_at set default now();
alter table cms_templates alter column updated_at set default now();

alter table seo_pages alter column path_prefix      set default '';
alter table seo_pages alter column status           set default 'draft';
alter table seo_pages alter column content_sections set default '[]'::jsonb;
alter table seo_pages alter column keywords         set default '{}';
alter table seo_pages alter column is_indexed       set default true;
alter table seo_pages alter column is_followed      set default true;
alter table seo_pages alter column schema_type      set default 'WebPage';
alter table seo_pages alter column created_at       set default now();
alter table seo_pages alter column updated_at       set default now();

alter table seo_redirects alter column status_code set default 301;
alter table seo_redirects alter column hit_count   set default 0;
alter table seo_redirects alter column created_at  set default now();

alter table seo_admins alter column role       set default 'editor';
alter table seo_admins alter column created_at set default now();

-- ─── 2e. Legacy NOT NULL columns ────────────────────────────────────────────
--
-- The mirror image of 2a: a column this file has never heard of, declared NOT
-- NULL with no default, still sitting on a live table. Every insert then fails.
-- `fixer_profiles.user_id` — the predecessor of `owner_id` — is how this was
-- found, and it fails on the *first* seeded row, so each such column costs a
-- full round-trip to discover. There is no `drop not null if exists`, and
-- naming them one at a time only works until the next one.
--
-- So: enumerate what this schema actually defines, and relax NOT NULL on
-- anything else that would block a write. Deliberately conservative —
--
--   • Nothing is dropped. A legacy column keeps its name, type and data; it
--     simply stops being mandatory. Dropping it would be tidier and
--     irreversible, and this file should never be the reason a column of real
--     data disappears from a production database.
--   • Columns with a default are left alone — the default satisfies the
--     constraint, so they block nothing.
--   • Only the ten tables this schema owns are considered.
--
-- Each ALTER is wrapped individually so one unfixable column (a legacy primary
-- key member, say) reports a warning instead of aborting the migration.

do $$
declare
  legacy record;
  relaxed integer := 0;
begin
  for legacy in
    -- `table_name` and `column_name` are `information_schema.sql_identifier`,
    -- not text, so cast before comparing against literals.
    select c.table_name::text as tbl, c.column_name::text as col
      from information_schema.columns c
     where c.table_schema = 'public'
       and c.is_nullable  = 'NO'
       and c.column_default is null
       and c.is_generated = 'NEVER'
       and c.identity_generation is null
       and c.table_name::text in (
             'users', 'fixer_profiles', 'repair_categories', 'fixer_categories',
             'reviews', 'seo_global', 'cms_templates', 'seo_pages',
             'seo_redirects', 'seo_admins'
           )
       -- Columns this schema declares NOT NULL with no default. Every writer
       -- supplies a value for these, so the constraint is intentional.
       and c.table_name::text || '.' || c.column_name::text not in (
             'users.id',
             'fixer_profiles.id', 'fixer_profiles.slug',
             'fixer_profiles.shop_name', 'fixer_profiles.address',
             'repair_categories.id', 'repair_categories.name',
             'repair_categories.slug',
             'fixer_categories.fixer_id', 'fixer_categories.category_id',
             'reviews.id', 'reviews.fixer_id',
             'reviews.customer_id', 'reviews.rating',
             'seo_global.id',
             'cms_templates.id', 'cms_templates.name', 'cms_templates.slug',
             'seo_pages.id', 'seo_pages.title', 'seo_pages.slug',
             'seo_redirects.id', 'seo_redirects.source_url',
             'seo_redirects.destination_url',
             'seo_admins.id', 'seo_admins.email', 'seo_admins.password_hash'
           )
  loop
    begin
      execute format('alter table public.%I alter column %I drop not null',
                     legacy.tbl, legacy.col);
      raise notice 'Relaxed NOT NULL on legacy column %.% (not in current schema).',
        legacy.tbl, legacy.col;
      relaxed := relaxed + 1;
    exception when others then
      raise warning 'Could not relax %.%: %. Resolve this by hand — inserts will fail until you do.',
        legacy.tbl, legacy.col, sqlerrm;
    end;
  end loop;

  if relaxed = 0 then
    raise notice 'No legacy NOT NULL columns found — schema is current.';
  else
    raise notice '% legacy column(s) relaxed. Review and drop by hand once you have confirmed they are dead.', relaxed;
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 3 — Constraints
--
-- Every column exists now, so checks and unique indexes are safe.
--
-- Checks are added `not valid`: a lagging table holding pre-existing rows must
-- not abort the migration. Every insert and update from here on is checked, and
-- any historical row that violates one is left for a human rather than silently
-- rewritten. Run `validate constraint` by hand once you have cleaned the data.
--
-- `add constraint` has no `if not exists`, so each is wrapped to swallow the
-- duplicate on re-run.
-- ════════════════════════════════════════════════════════════════════════════

do $$ begin
  alter table fixer_profiles add constraint fixer_profiles_name_len
    check (length(btrim(shop_name)) between 2 and 120) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table fixer_profiles add constraint fixer_profiles_bio_len
    check (length(bio) <= 5000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table fixer_profiles add constraint fixer_profiles_lat_range
    check (lat between -90 and 90) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table fixer_profiles add constraint fixer_profiles_lng_range
    check (lng between -180 and 180) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table fixer_profiles add constraint fixer_profiles_phone_shape
    check (contact_phone ~ '^[0-9+][0-9 ()+-]{5,24}$') not valid;
exception when duplicate_object then null; end $$;

-- A profile is only listable once it can actually be placed on a map.
do $$ begin
  alter table fixer_profiles add constraint fixer_geo_complete check (
    (lat is null and lng is null) or (lat is not null and lng is not null)
  ) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table fixer_profiles add constraint fixer_hours_ordered
    check (opening_time < closing_time) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table fixer_profiles add constraint fixer_profiles_owner_fk
    foreign key (owner_id) references auth.users (id) on delete set null not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table reviews add constraint reviews_rating_range
    check (rating between 1 and 5) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table reviews add constraint reviews_text_len
    check (length(text) <= 4000) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_global add constraint seo_global_id_check check (id = 1) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table cms_templates add constraint cms_templates_sections_is_array
    check (jsonb_typeof(sections) = 'array') not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_pages add constraint seo_pages_slug_shape
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_pages add constraint seo_pages_meta_title_len
    check (length(meta_title) <= 200) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_pages add constraint seo_pages_meta_desc_len
    check (length(meta_description) <= 400) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_pages add constraint seo_pages_sections_is_array
    check (jsonb_typeof(content_sections) = 'array') not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_pages add constraint seo_pages_prefix_shape
    check (path_prefix !~ '(^/)|(/$)') not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_pages add constraint seo_pages_template_fk
    foreign key (template_id) references cms_templates (id) on delete set null not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_redirects add constraint seo_redirects_status_code_check
    check (status_code in (301, 302, 307, 308)) not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_redirects add constraint seo_redirects_source_shape
    check (source_url like '/%') not valid;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table seo_redirects add constraint seo_redirects_no_self_loop
    check (source_url <> destination_url) not valid;
exception when duplicate_object then null; end $$;

-- ─── Unique indexes ─────────────────────────────────────────────────────────
--
-- `create unique index if not exists` matches on the index NAME, not its
-- definition — and Postgres auto-names an inline `unique (slug)` as
-- `<table>_slug_key`, exactly the name used below. On a database carrying the
-- older plain-column index the create is therefore a silent no-op, leaving the
-- wrong kind of index in place forever and failing every upsert with 42P10.
--
-- So each block tests `pg_indexes.indexdef` for the *expression it needs*, and
-- clears whatever is holding the name before creating the right one.
--
-- Which expression each table needs is decided by its writer, not by taste:
--
--   fixer_profiles     seed.sql       on conflict (lower(slug))
--   repair_categories  seed.sql       on conflict (lower(slug))
--   seo_pages          seed.sql       on conflict (lower(path_prefix), lower(slug))
--   seo_redirects      admin UI       no upsert; lowercase index prevents
--                                     /About and /about being separate rules
--   cms_templates      seed-seo-pages.ts   .upsert(…, { onConflict: "slug" })
--   reviews            reviews/actions.ts  .upsert(…, { onConflict: "fixer_id,customer_id" })
--
-- The last two are the exception that proves the rule: PostgREST sends
-- `on conflict (slug)` verbatim, and a plain column reference is NOT satisfied
-- by an index on `lower(slug)`. Those two must stay on the bare columns.
--
-- Every guard below tests `pg_indexes.indexdef`, and the bare-column guards must
-- also say `not ilike '%lower%'`: a `lower(slug)` index renders as
-- `lower((slug)::text)`, which contains the substring `(slug)`, so a guard
-- looking only for `(slug)` would match the wrong index and skip. The two
-- uuid-pair guards (fixer_categories, reviews) are exempt — `lower()` on a uuid
-- is not expressible without an explicit cast, so there is nothing to exclude.

do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'fixer_profiles'
       and indexdef ilike '%unique%' and indexdef ilike '%lower(slug)%'
  ) then
    alter table fixer_profiles drop constraint if exists fixer_profiles_slug_key;
    drop index if exists fixer_profiles_slug_key;
    create unique index fixer_profiles_slug_key on fixer_profiles (lower(slug));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'repair_categories'
       and indexdef ilike '%unique%' and indexdef ilike '%lower(slug)%'
  ) then
    alter table repair_categories drop constraint if exists repair_categories_slug_key;
    drop index if exists repair_categories_slug_key;
    create unique index repair_categories_slug_key on repair_categories (lower(slug));
  end if;
end $$;

-- `seed.sql` links shops to categories with `on conflict (fixer_id, category_id)`.
-- A deployment that gave this join table a surrogate `id` primary key instead
-- satisfies neither the upsert nor the "one link per pair" invariant, so add the
-- pair index when it is missing rather than trusting the primary key above.
do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'fixer_categories'
       and indexdef ilike '%unique%'
       and indexdef ilike '%fixer_id%'
       and indexdef ilike '%category_id%'
  ) then
    -- Collapse duplicate links first, or the unique index cannot be built.
    delete from fixer_categories a
     using fixer_categories b
     where a.ctid > b.ctid
       and a.fixer_id = b.fixer_id
       and a.category_id = b.category_id;

    create unique index fixer_categories_pair_key
      on fixer_categories (fixer_id, category_id);
  end if;
end $$;

-- One review per customer per shop. Prevents rating inflation via repeats, and
-- is the conflict target for the review form's upsert.
do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'reviews'
       and indexdef ilike '%unique%'
       and indexdef ilike '%fixer_id%'
       and indexdef ilike '%customer_id%'
  ) then
    delete from reviews a
     using reviews b
     where a.ctid > b.ctid
       and a.fixer_id = b.fixer_id
       and a.customer_id = b.customer_id;

    create unique index reviews_fixer_customer_key
      on reviews (fixer_id, customer_id);
  end if;
end $$;

-- Bare `slug`, not `lower(slug)`: seed-seo-pages.ts upserts with
-- `onConflict: "slug"` and PostgREST passes that through literally.
do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'cms_templates'
       and indexdef ilike '%unique%'
       and indexdef ilike '%(slug)%'
       and indexdef not ilike '%lower(slug)%'
  ) then
    drop index if exists cms_templates_slug_key;
    alter table cms_templates drop constraint if exists cms_templates_slug_key;

    delete from cms_templates a
     using cms_templates b
     where a.ctid > b.ctid and a.slug = b.slug;

    create unique index cms_templates_slug_key on cms_templates (slug);
  end if;
end $$;

-- The catch-all router resolves on (path_prefix, slug), so they must be unique
-- together. Two things to undo on an older deployment. First, `slug` alone may
-- still be unique — the bug called out at the top of this file, where
-- /guides/screen-repair and /services/screen-repair collide — so the legacy
-- constraint has to go or the second of the pair can never be inserted. Second,
-- the pair index must be on the lowered expressions, because `seed.sql` upserts
-- with `on conflict (lower(path_prefix), lower(slug))`.
alter table seo_pages drop constraint if exists seo_pages_slug_key;

do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'seo_pages'
       and indexdef ilike '%unique%'
       and indexdef ilike '%lower(path_prefix)%'
       and indexdef ilike '%lower(slug)%'
  ) then
    -- A slug-only unique index created standalone rather than as a table
    -- constraint is not covered by the drop above.
    drop index if exists seo_pages_slug_key;
    alter table seo_pages drop constraint if exists seo_pages_path_key;
    drop index if exists seo_pages_path_key;

    delete from seo_pages a
     using seo_pages b
     where a.ctid > b.ctid
       and lower(a.path_prefix) = lower(b.path_prefix)
       and lower(a.slug) = lower(b.slug);

    create unique index seo_pages_path_key
      on seo_pages (lower(path_prefix), lower(slug));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'seo_redirects'
       and indexdef ilike '%unique%' and indexdef ilike '%lower(source_url)%'
  ) then
    alter table seo_redirects drop constraint if exists seo_redirects_source_url_key;
    drop index if exists seo_redirects_source_url_key;
    alter table seo_redirects drop constraint if exists seo_redirects_source_key;
    drop index if exists seo_redirects_source_key;

    delete from seo_redirects a
     using seo_redirects b
     where a.ctid > b.ctid and lower(a.source_url) = lower(b.source_url);

    create unique index seo_redirects_source_key
      on seo_redirects (lower(source_url));
  end if;
end $$;

-- Bare `email`, not `lower(email)`: the column is citext, so a plain index is
-- already case-insensitive, and `admin:hash` emits `on conflict (email)`.
--
-- The `not ilike` is load-bearing. A `lower(email)` index renders its indexdef as
-- `lower((email)::text)` — which *contains* the substring `(email)`, so without
-- the exclusion this guard would see a lower() index, decide the table was fine,
-- skip, and leave `on conflict (email)` with nothing to match (42P10).
do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and tablename = 'seo_admins'
       and indexdef ilike '%unique%'
       and indexdef ilike '%(email)%'
       and indexdef not ilike '%lower%'
  ) then
    alter table seo_admins drop constraint if exists seo_admins_email_key;
    drop index if exists seo_admins_email_key;

    delete from seo_admins a
     using seo_admins b
     where a.ctid > b.ctid and a.email = b.email;

    create unique index seo_admins_email_key on seo_admins (email);
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 4 — Indexes
-- ════════════════════════════════════════════════════════════════════════════

create index if not exists fixer_profiles_geo_idx
  on fixer_profiles (lat, lng) where lat is not null;
create index if not exists fixer_profiles_rating_idx
  on fixer_profiles (rating_avg desc, rating_count desc);
create index if not exists fixer_profiles_name_trgm_idx
  on fixer_profiles using gin (shop_name gin_trgm_ops);
create index if not exists fixer_profiles_verified_idx
  on fixer_profiles (verified) where verified;

create index if not exists fixer_categories_category_idx
  on fixer_categories (category_id);

create index if not exists reviews_fixer_created_idx
  on reviews (fixer_id, created_at desc);

create index if not exists seo_pages_status_idx
  on seo_pages (status) where status = 'published';
create index if not exists seo_pages_sitemap_idx
  on seo_pages (updated_at desc) where status = 'published' and is_indexed;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 5 — Functions and triggers
-- ════════════════════════════════════════════════════════════════════════════

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fixer_profiles_updated_at on fixer_profiles;
create trigger fixer_profiles_updated_at
  before update on fixer_profiles
  for each row execute function set_updated_at();

drop trigger if exists reviews_updated_at on reviews;
create trigger reviews_updated_at
  before update on reviews
  for each row execute function set_updated_at();

drop trigger if exists cms_templates_updated_at on cms_templates;
create trigger cms_templates_updated_at
  before update on cms_templates
  for each row execute function set_updated_at();

drop trigger if exists seo_pages_updated_at on seo_pages;
create trigger seo_pages_updated_at
  before update on seo_pages
  for each row execute function set_updated_at();

-- Mirror every new auth.users row into public.users.
--
-- Without this, `users` stays empty no matter how many people sign up: the app
-- never inserts into it, and it cannot — the row has to exist before the user's
-- first authenticated request, and RLS would not permit a client to create a
-- row for an id it does not yet hold a session for. Every review join
-- (`customer:users(...)`) then returns null and the UI falls back to
-- "Verified customer" for everyone.
--
-- `security definer` is required: this runs as part of the auth schema's insert,
-- where the caller has no privilege on public.users.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    -- Supabase stores whatever the client passed as `options.data` here. Fall
    -- back to the local-part of the email, then to a literal — an explicit NULL
    -- would override the column default and trip the NOT NULL constraint,
    -- failing the signup itself rather than just the name.
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Customer'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  -- A retried signup or an admin-created user must not error the insert.
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep fixer_profiles.rating_avg / rating_count authoritative.
create or replace function sync_fixer_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid := coalesce(new.fixer_id, old.fixer_id);
begin
  update fixer_profiles f
     set rating_avg = coalesce(agg.avg_rating, 0),
         rating_count = coalesce(agg.n, 0)
    from (
      select avg(rating)::numeric(2,1) as avg_rating, count(*) as n
        from reviews where fixer_id = target
    ) agg
   where f.id = target;
  return null;
end;
$$;

drop trigger if exists reviews_sync_rating on reviews;
create trigger reviews_sync_rating
  after insert or update of rating or delete on reviews
  for each row execute function sync_fixer_rating();

-- Stamp published_at the first time a page goes live.
create or replace function stamp_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists seo_pages_publish_stamp on seo_pages;
create trigger seo_pages_publish_stamp
  before insert or update of status on seo_pages
  for each row execute function stamp_published_at();

-- ─── Read-side helper ───────────────────────────────────────────────────────
--
-- Bounding-box search used by /search. Cheaper than PostGIS for a map-viewport
-- query and needs no extra extension.
--
-- Postgres treats a changed argument list as a NEW function rather than a
-- replacement, which would leave two overloads behind and make every RPC call
-- ambiguous. Drop the known prior signatures first so re-running this file is
-- always idempotent.
drop function if exists search_fixers(
  double precision, double precision, double precision, double precision,
  text, numeric, boolean, boolean, boolean, integer
);
drop function if exists search_fixers(
  double precision, double precision, double precision, double precision,
  text, text, numeric, boolean, boolean, boolean, integer
);

create function search_fixers(
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
  result_limit integer default 100
)
returns setof fixer_profiles
language sql
stable
as $$
  select f.*
    from fixer_profiles f
   where (
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


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 6 — Rows
--
-- Last, because an insert is the statement most sensitive to a column that
-- phase 2 has not yet reconciled. Everything here is idempotent.
-- ════════════════════════════════════════════════════════════════════════════

-- Backfill anyone who signed up before the trigger above existed.
insert into public.users (id, display_name)
select u.id,
       coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'Customer')
  from auth.users u
  left join public.users p on p.id = u.id
 where p.id is null
on conflict (id) do nothing;

-- The settings singleton. Every column has a default, so `(id) values (1)` is
-- a complete row.
insert into seo_global (id) values (1) on conflict (id) do nothing;
