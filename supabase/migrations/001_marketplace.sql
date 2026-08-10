-- ════════════════════════════════════════════════════════════════════════════
-- 001_marketplace.sql — bookings, dashboards, messaging, warranty, money
--
-- Run order:  schema.sql → policies.sql → THIS FILE → policies-marketplace.sql
-- Idempotent: safe to re-run, on a fresh database or one several revisions old.
--
-- ─── Why this file is phased like schema.sql ────────────────────────────────
--
-- Same reasoning, same hazard. `create table if not exists` skips an existing
-- table wholesale — it never compares definitions — so on a database made from
-- an earlier revision of this file the create is a silent no-op and every
-- column added since is simply missing. Anything mentioning that column then
-- fails with 42703 and aborts the rest of the run.
--
--   1. Extensions + enums
--   2. Tables        — bare creates, nothing else
--   3. Columns       — reconciled on existing tables (users, fixer_profiles,
--                      reviews) and on this file's own tables
--   4. Constraints   — checks, uniques, and the exclusion constraint
--   5. Indexes       — plain lookup indexes
--   6. Functions     — triggers, references, warranty close
--
-- ─── Conventions ────────────────────────────────────────────────────────────
--
--   • MONEY IS INTEGER PENCE. Never float, never numeric. `4999` is £49.99.
--     Floating point cannot represent 0.1 exactly and money must not be
--     approximate; storing minor units keeps every sum exact.
--   • Timestamps are timestamptz. A booking crossing a DST boundary is a real
--     scenario in Europe/London and naive timestamps get it wrong twice a year.
--   • Enums are created with the same exception-swallowing block schema.sql
--     uses. Note there is deliberately no `alter type ... add value`
--     reconciliation: a value added inside a transaction cannot be used until
--     that transaction commits, and the SQL Editor runs this whole file as one.
--     An enum genuinely missing a value needs its own separate run.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 0 — Preflight
--
-- `create table if not exists` never compares definitions. If a relation of the
-- same name already exists — from an earlier draft of this file, from another
-- project, or as a view — the create is a silent no-op and the table keeps its
-- old shape. The run then dies hundreds of lines later on a column that was
-- never added, e.g.
--
--   ERROR: 42703: column "thread_id" referenced in foreign key constraint
--          does not exist
--   CONTEXT: alter table messages add constraint messages_thread_fkey
--
-- which names a symptom in phase 4 and says nothing about the cause in phase 2.
-- `create type ... exception when duplicate_object` has the same blind spot: it
-- binds SQLSTATE 42710, raised when the type NAME is taken, and never looks at
-- the value list, so a stale 8-value enum is accepted as though the 12-value
-- one below had been created.
--
-- So: check first, and check every column each later phase actually depends on
-- — every one named by a foreign key, check constraint, unique index or index —
-- together with its type. Sampling one column per table is worse than no check
-- at all: it reports the table as covered while the column that would actually
-- fail goes unexamined. Type matters as much as existence, because a legacy
-- `messages.thread_id bigint` satisfies an existence check and then fails with
-- 42804 instead — a different SQLSTATE, reading as an unrelated new problem.
--
-- Columns phase 3 reconciles with `add column if not exists` are deliberately
-- absent from 0c: those genuinely self-heal, so flagging them would abort a run
-- that would have succeeded.
--
-- Three blocks, each reporting ALL of its mismatches in one message and
-- aborting before anything is written — one failure per run is a slow way to
-- find four problems.
--
--   0a  prerequisites this file extends but does not create
--   0b  enum value sets
--   0c  colliding tables, every dependency column, with types
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 0a — Prerequisites ─────────────────────────────────────────────────────
--
-- This migration extends schema.sql; it does not stand alone. Without it the
-- first foreign key to fixer_profiles fails with 42P01, which reads as a bug in
-- this file rather than as a missing prerequisite.
do $$
declare
  t       text;
  report  text := '';
begin
  foreach t in array array['users', 'fixer_profiles', 'repair_categories', 'reviews']
  loop
    -- pg_catalog rather than information_schema: the latter hides objects the
    -- current role lacks privileges on, which would read as "absent".
    if not exists (
      select 1
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = t and c.relkind in ('r', 'p')
    ) then
      report := report || format(E'\n  • table public.%s is missing', t);
    end if;
  end loop;

  if to_regtype('weekday') is null then
    report := report || E'\n  • type weekday is missing';
  end if;

  if report <> '' then
    raise exception
      E'Preflight 0a — supabase/schema.sql has not been run on this database:%', report
      using hint = 'Run supabase/schema.sql, then supabase/seed.sql, then this file.';
  end if;

  -- Separate message: this one means the database is not a Supabase project,
  -- not that a file was skipped.
  if not exists (
    select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'auth' and c.relname = 'users' and c.relkind in ('r', 'p')
  ) then
    raise exception 'Preflight 0a — auth.users does not exist'
      using hint = 'Every customer-facing foreign key in this file targets '
        'auth.users. That schema is created by Supabase itself, so this is '
        'either not a Supabase database or the auth schema was dropped.';
  end if;
end $$;


-- ─── 0b — Enum value sets ───────────────────────────────────────────────────
--
-- A type absent here is fine: phase 1 creates it correctly. A type PRESENT but
-- short of values is the failure this catches. The DDL in phases 4–6 depends on
-- specific labels ('requested', 'confirmed', 'in_progress', 'completed' in the
-- partial indexes and the overlap constraint), and the trigger bodies depend on
-- more — but PL/pgSQL defers expression parsing, so those create successfully
-- and fail on first use with 22P02.
--
-- Values cannot be added and used in the same transaction, and the SQL Editor
-- runs this whole file as one, so the fix is necessarily a separate run. That
-- is why this reports rather than repairs.
do $$
declare
  r        record;
  missing  text;
  report   text := '';
begin
  for r in
    select * from (values
      ('booking_status',     array['requested','accepted','confirmed','in_progress',
                                   'completed','closed','declined','cancelled_customer',
                                   'cancelled_shop','no_show','expired','disputed']),
      ('delivery_mode',      array['in_shop','home_visit','pickup_drop']),
      ('price_type',         array['fixed','from','quote']),
      ('claim_status',       array['pending','approved','rejected','withdrawn']),
      ('payment_status',     array['pending','authorized','captured','refunded',
                                   'partially_refunded','failed']),
      ('payout_status',      array['scheduled','in_transit','paid','failed']),
      ('dispute_status',     array['open','awaiting_customer','awaiting_shop',
                                   'under_review','resolved','withdrawn']),
      ('dispute_resolution', array['refund_full','refund_partial','redo_service','no_action']),
      ('contact_method',     array['email','phone','sms']),
      ('notification_kind',  array['booking_requested','booking_accepted','booking_declined',
                                   'booking_confirmed','booking_reminder','booking_started',
                                   'booking_completed','booking_cancelled','booking_rescheduled',
                                   'message_received','review_request','warranty_expiring',
                                   'dispute_opened','dispute_updated','dispute_resolved',
                                   'payout_sent','claim_reviewed'])
    ) as t(typ, vals)
  loop
    if to_regtype(r.typ) is null then
      continue;                       -- phase 1 will create it with the full set
    end if;

    select string_agg(format('%L', v), ', ' order by v)
      into missing
      from unnest(r.vals) as v
     where not exists (
       select 1
         from pg_catalog.pg_enum e
         join pg_catalog.pg_type ty on ty.oid = e.enumtypid
         join pg_catalog.pg_namespace n on n.oid = ty.typnamespace
        where n.nspname = 'public' and ty.typname = r.typ and e.enumlabel = v
     );

    if missing is not null then
      report := report || format(E'\n  • type %s is missing: %s', r.typ, missing);
    end if;
  end loop;

  if report <> '' then
    raise exception
      E'Preflight 0b — an enum already exists with fewer values than this file needs:%',
      report
      using hint =
        'Add them in their OWN run first, before this file: '
        'alter type <type> add value if not exists ''<value>''; '
        'one statement per missing value. A value added inside a transaction '
        'cannot be used until that transaction commits, which is why this '
        'cannot be repaired inline.';
  end if;
end $$;


-- ─── 0c — Colliding tables ──────────────────────────────────────────────────
do $$
declare
  r            record;
  kind         char;
  present      text[] := '{}';
  found_type   text;
  found_oid    oid;
  expected_oid oid;
  report       text := '';
begin
  -- Pass 1: which of this file's table names are already taken, and by what.
  for r in
    select * from (values
      ('shop_claims'), ('user_addresses'), ('shop_services'), ('shop_availability'),
      ('shop_time_off'), ('bookings'), ('booking_events'), ('booking_notes'),
      ('booking_attachments'), ('saved_experts'), ('message_threads'), ('messages'),
      ('message_attachments'), ('notifications'), ('notification_prefs'), ('payments'),
      ('refunds'), ('payouts'), ('ledger_entries'), ('disputes'), ('dispute_messages'),
      ('dispute_evidence'), ('client_notes')
    ) as t(tbl)
  loop
    select c.relkind into kind
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = r.tbl;

    if kind is null then
      continue;                       -- does not exist yet; phase 2 creates it
    elsif kind in ('r', 'p') then
      present := present || r.tbl;
    else
      -- A view or matview named `bookings` cannot be altered into shape at all.
      report := report || format(
        E'\n  • public.%s already exists and is not a table (relkind=%s)', r.tbl, kind);
    end if;
  end loop;

  -- Pass 2: every column a later phase depends on, and its type. One row per
  -- (table, column) — the comment on each group says what needs it.
  for r in
    select * from (values
      -- fkeys + shop_claims_user_idx + shop_claims_status_idx + partial uniques
      ('shop_claims',         'fixer_id',            'uuid'),
      ('shop_claims',         'user_id',             'uuid'),
      ('shop_claims',         'status',              'claim_status'),
      ('shop_claims',         'created_at',          'timestamptz'),
      ('shop_claims',         'updated_at',          'timestamptz'),
      -- fkey + user_addresses_one_default + user_addresses_user_idx
      ('user_addresses',      'user_id',             'uuid'),
      ('user_addresses',      'is_default',          'boolean'),
      -- fkeys + shop_services_price_sane + _duration_sane + shop_services_fixer_idx
      ('shop_services',       'fixer_id',            'uuid'),
      ('shop_services',       'category_id',         'uuid'),
      ('shop_services',       'price_type',          'price_type'),
      ('shop_services',       'price_min',           'integer'),
      ('shop_services',       'price_max',           'integer'),
      ('shop_services',       'duration_minutes',    'integer'),
      ('shop_services',       'sort_order',          'integer'),
      ('shop_services',       'is_active',           'boolean'),
      ('shop_services',       'updated_at',          'timestamptz'),
      -- fkey + shop_availability_window_sane + _unique_window + _fixer_idx
      ('shop_availability',   'fixer_id',            'uuid'),
      ('shop_availability',   'weekday',             'weekday'),
      ('shop_availability',   'starts_at',           'time'),
      ('shop_availability',   'ends_at',             'time'),
      ('shop_availability',   'buffer_minutes',      'integer'),
      ('shop_availability',   'capacity',            'integer'),
      -- fkey needs fixer_id; the GiST index needs period. The old preflight
      -- sampled only period, so the fkey at phase 4 was unguarded.
      ('shop_time_off',       'fixer_id',            'uuid'),
      ('shop_time_off',       'period',              'tstzrange'),
      -- fkeys, bookings_slot_not_empty, bookings_amounts_sane, the overlap
      -- exclusion, bookings_reference_key, and five indexes
      ('bookings',            'customer_id',         'uuid'),
      ('bookings',            'fixer_id',            'uuid'),
      ('bookings',            'service_id',          'uuid'),
      ('bookings',            'reference',           'text'),
      ('bookings',            'status',              'booking_status'),
      ('bookings',            'slot',                'tstzrange'),
      ('bookings',            'quoted_amount',       'integer'),
      ('bookings',            'final_amount',        'integer'),
      ('bookings',            'warranty_expires_at', 'timestamptz'),
      ('bookings',            'created_at',          'timestamptz'),
      ('bookings',            'updated_at',          'timestamptz'),
      ('booking_events',      'booking_id',          'uuid'),
      ('booking_events',      'created_at',          'timestamptz'),
      ('booking_notes',       'booking_id',          'uuid'),
      ('booking_notes',       'fixer_id',            'uuid'),
      ('booking_notes',       'updated_at',          'timestamptz'),
      ('booking_attachments', 'booking_id',          'uuid'),
      ('saved_experts',       'user_id',             'uuid'),
      ('saved_experts',       'fixer_id',            'uuid'),
      ('saved_experts',       'created_at',          'timestamptz'),
      ('message_threads',     'booking_id',          'uuid'),
      ('message_threads',     'customer_id',         'uuid'),
      ('message_threads',     'fixer_id',            'uuid'),
      ('message_threads',     'last_message_at',     'timestamptz'),
      -- the reported failure: fkey + messages_thread_idx
      ('messages',            'thread_id',           'uuid'),
      ('messages',            'created_at',          'timestamptz'),
      ('message_attachments', 'message_id',          'uuid'),
      ('notifications',       'user_id',             'uuid'),
      ('notifications',       'read_at',             'timestamptz'),
      ('notifications',       'created_at',          'timestamptz'),
      ('notification_prefs',  'user_id',             'uuid'),
      ('notification_prefs',  'updated_at',          'timestamptz'),
      ('payments',            'booking_id',          'uuid'),
      ('payments',            'amount',              'integer'),
      ('payments',            'updated_at',          'timestamptz'),
      ('refunds',             'payment_id',          'uuid'),
      ('refunds',             'amount',              'integer'),
      ('payouts',             'fixer_id',            'uuid'),
      ('payouts',             'created_at',          'timestamptz'),
      -- ledger_entries has no constraint at all; ledger_fixer_idx is the only
      -- statement that touches it, and it needs these two. The old preflight
      -- sampled booking_id, which nothing in this file references.
      ('ledger_entries',      'fixer_id',            'uuid'),
      ('ledger_entries',      'created_at',          'timestamptz'),
      ('disputes',            'booking_id',          'uuid'),
      ('disputes',            'status',              'dispute_status'),
      ('disputes',            'created_at',          'timestamptz'),
      ('disputes',            'updated_at',          'timestamptz'),
      ('dispute_messages',    'dispute_id',          'uuid'),
      ('dispute_evidence',    'dispute_id',          'uuid'),
      ('client_notes',        'fixer_id',            'uuid'),
      ('client_notes',        'customer_id',         'uuid'),
      ('client_notes',        'updated_at',          'timestamptz')
    ) as t(tbl, col, typ)
  loop
    if not (r.tbl = any(present)) then
      continue;                       -- fresh, or already reported in pass 1
    end if;

    -- `select into` nulls both variables when no row matches, so no stale
    -- value can leak from the previous iteration.
    select format_type(a.atttypid, a.atttypmod), a.atttypid
      into found_type, found_oid
      from pg_catalog.pg_attribute a
      join pg_catalog.pg_class c on c.oid = a.attrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = r.tbl
       and a.attname = r.col
       and a.attnum > 0
       and not a.attisdropped;

    expected_oid := to_regtype(r.typ);

    if found_type is null then
      report := report || format(
        E'\n  • public.%s has no "%s" column (expected %s)', r.tbl, r.col, r.typ);
    elsif expected_oid is null then
      report := report || format(
        E'\n  • public.%s."%s" is %s and the expected type %s does not exist here',
        r.tbl, r.col, found_type, r.typ);
    elsif found_oid <> expected_oid then
      report := report || format(
        E'\n  • public.%s."%s" is %s, expected %s', r.tbl, r.col, found_type, r.typ);
    end if;
  end loop;

  if report <> '' then
    raise exception
      E'Preflight 0c — a relation this migration creates already exists with the wrong shape:%',
      report
      using hint =
        'create table if not exists is a silent no-op on a name that is already '
        'taken — it never compares definitions — so these columns would never be '
        'added and a later phase would abort. Look before you choose: '
        'select * from public.<name> limit 5; '
        'If it is an empty leftover from an earlier draft, drop it: '
        'drop table public.<name> cascade; '
        'If it holds data worth keeping, move it out of the way schema and all: '
        'create schema if not exists legacy; '
        'alter table public.<name> set schema legacy; '
        'Prefer that to a rename — renaming a table leaves its index and '
        'constraint names behind in public, so <name>_pkey would then collide '
        'with the primary key this migration creates and fail with 42P07. '
        'set schema moves the indexes with the table.';
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 1 — Extensions and enums
-- ════════════════════════════════════════════════════════════════════════════

-- Required by the bookings_no_overlap exclusion constraint in phase 4. GiST
-- cannot index a plain-equality column like `fixer_id uuid` without this;
-- btree_gist supplies the operator class that lets `=` and `&&` sit in one
-- constraint.
create extension if not exists "btree_gist";

do $$ begin
  create type booking_status as enum (
    'requested',           -- customer asked; shop has not answered yet
    'accepted',            -- shop said yes; awaiting deposit/confirmation
    'confirmed',           -- locked in, holds the slot
    'in_progress',         -- work underway
    'completed',           -- work done, warranty window opens
    'closed',              -- warranty expired without a claim; final
    'declined',            -- shop said no
    'cancelled_customer',
    'cancelled_shop',
    'no_show',
    'expired',             -- shop never answered in time
    'disputed'             -- a warranty claim is open
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type delivery_mode as enum ('in_shop', 'home_visit', 'pickup_drop');
exception when duplicate_object then null; end $$;

do $$ begin
  create type price_type as enum ('fixed', 'from', 'quote');
exception when duplicate_object then null; end $$;

do $$ begin
  create type claim_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum (
    'pending', 'authorized', 'captured', 'refunded', 'partially_refunded', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payout_status as enum ('scheduled', 'in_transit', 'paid', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_status as enum (
    'open', 'awaiting_customer', 'awaiting_shop', 'under_review', 'resolved', 'withdrawn'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_resolution as enum (
    'refund_full', 'refund_partial', 'redo_service', 'no_action'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_method as enum ('email', 'phone', 'sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_kind as enum (
    'booking_requested', 'booking_accepted', 'booking_declined', 'booking_confirmed',
    'booking_reminder', 'booking_started', 'booking_completed',
    'booking_cancelled', 'booking_rescheduled',
    'message_received', 'review_request', 'warranty_expiring',
    'dispute_opened', 'dispute_updated', 'dispute_resolved',
    'payout_sent', 'claim_reviewed'
  );
exception when duplicate_object then null; end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 2 — Tables
--
-- Bare creates. Order matters only for foreign keys. Following schema.sql's
-- convention, FKs that phase 4 also adds by name are left off here — an inline
-- `references` is auto-named `<table>_<col>_fkey`, so declaring it in both
-- places leaves a fresh database carrying two identical constraints under
-- different names.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Shop ownership ─────────────────────────────────────────────────────────
--
-- The gap this closes: `owner_id` is never set anywhere in seed.sql, so all ten
-- seeded shops are unowned and nobody can accept a booking. Claiming is
-- reviewed rather than automatic because owning a listing grants write access
-- to a live public page.
create table if not exists shop_claims (
  id          uuid primary key default gen_random_uuid(),
  fixer_id    uuid not null,
  user_id     uuid not null,
  status      claim_status not null default 'pending',

  -- Free text from the claimant: a business email on the shop's domain, a
  -- registration number, a phone they can be called back on.
  evidence    text,
  contact_phone text,

  reviewed_by uuid,          -- admin_users.id; no FK, that table is admin-side
  reviewed_at timestamptz,
  review_note text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Customer addresses ─────────────────────────────────────────────────────
--
-- Separate from users because home-visit bookings need a *history* of
-- addresses, not just the current one: a booking's address must stay accurate
-- after the customer moves.
create table if not exists user_addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null,
  label         text,                    -- 'Home', 'Work'
  line1         text not null,
  line2         text,
  city          text,
  postcode      text,
  country       text not null default 'GB',
  lat           double precision,
  lng           double precision,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── Service catalogue ──────────────────────────────────────────────────────
create table if not exists shop_services (
  id               uuid primary key default gen_random_uuid(),
  fixer_id         uuid not null,
  category_id      uuid,

  name             text not null,
  description      text,

  -- Pence. price_type decides how these read in the UI:
  --   fixed → "£49.99"      (price_min only)
  --   from  → "from £49.99" (price_min only)
  --   quote → "quote on inspection" (both may be null)
  price_type       price_type not null default 'fixed',
  price_min        integer,
  price_max        integer,
  currency         text not null default 'GBP',

  duration_minutes integer not null default 60,
  delivery_modes   delivery_mode[] not null default '{in_shop}',

  -- Days of cover this service carries once completed. Drives
  -- bookings.warranty_expires_at at completion time.
  warranty_days    integer not null default 3,

  is_active        boolean not null default true,
  sort_order       integer not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Availability ───────────────────────────────────────────────────────────
--
-- Layered on top of fixer_profiles.working_days / opening_time / closing_time
-- rather than replacing them. Those columns answer "is the shop open" for the
-- public page; these answer "which slots can be booked", which is a narrower
-- question — a shop may open at 09:00 but take its first appointment at 09:30.
--
-- A shop with no rows here falls back to its profile hours. That keeps all ten
-- seeded shops bookable without a backfill.
create table if not exists shop_availability (
  id             uuid primary key default gen_random_uuid(),
  fixer_id       uuid not null,
  weekday        weekday not null,
  starts_at      time not null,
  ends_at        time not null,

  -- Gap forced after each booking: cleanup, handover, travel between home
  -- visits. Slot generation subtracts it, so it can never be double-sold.
  buffer_minutes integer not null default 0,

  -- How many jobs can run concurrently in this window. A shop with two benches
  -- sets 2. The exclusion constraint on bookings enforces 1 per fixer, so
  -- anything above 1 is honoured by slot generation only — documented in
  -- src/lib/bookings/slots.ts.
  capacity       integer not null default 1,

  created_at     timestamptz not null default now()
);

create table if not exists shop_time_off (
  id         uuid primary key default gen_random_uuid(),
  fixer_id   uuid not null,
  period     tstzrange not null,
  reason     text,
  created_at timestamptz not null default now()
);

-- ─── Bookings ───────────────────────────────────────────────────────────────
--
-- The spine of the system. A few decisions worth stating:
--
--   • `slot` is a tstzrange, not start+end columns. It is what the overlap
--     exclusion constraint in phase 4 indexes, and range containment is the
--     natural query for "what is on this day".
--   • The address is SNAPSHOT, not a reference. A home visit records where the
--     engineer actually went; editing user_addresses later must not rewrite
--     history.
--   • Prices are snapshot for the same reason — a shop raising its rates must
--     not retroactively change what a past customer was quoted.
--   • One timestamp per transition rather than deriving from booking_events.
--     Events are the audit trail; these are the hot-path columns the dashboard
--     sorts and filters on.
create table if not exists bookings (
  id                uuid primary key default gen_random_uuid(),

  -- Human-facing, e.g. 'FIX-7Q2M4X'. What a customer quotes on the phone.
  -- Generated by the trigger in phase 6.
  reference         text not null,

  customer_id       uuid not null,
  fixer_id          uuid not null,
  service_id        uuid,

  status            booking_status not null default 'requested',
  delivery_mode     delivery_mode not null default 'in_shop',

  slot              tstzrange not null,

  -- What is broken. `device_details` is free text from the customer;
  -- `attachments` carry the photos.
  device_details    text,
  customer_notes    text,
  -- The shop's own private notes on this job live in `booking_notes`, NOT in a
  -- column here. RLS is row-level: a customer who can read their own booking
  -- row can read every column of it, so a `expert_notes text` column on this
  -- table would be readable by the customer no matter what the app selects.
  -- Same reasoning as `client_notes` further down.

  -- Address snapshot, only meaningful for home_visit / pickup_drop
  address_line1     text,
  address_line2     text,
  address_city      text,
  address_postcode  text,
  address_lat       double precision,
  address_lng       double precision,

  -- Pence, all of them
  quoted_amount     integer,
  final_amount      integer,
  platform_fee      integer not null default 0,
  tax_amount        integer not null default 0,
  currency          text not null default 'GBP',

  -- Warranty window. Opens at completion, length from the service's
  -- warranty_days. While open, the customer may raise a dispute.
  warranty_days     integer not null default 3,
  warranty_expires_at timestamptz,

  -- Lifecycle stamps
  requested_at      timestamptz not null default now(),
  responded_at      timestamptz,     -- accepted or declined
  confirmed_at      timestamptz,
  started_at        timestamptz,
  completed_at      timestamptz,
  closed_at         timestamptz,
  cancelled_at      timestamptz,
  cancelled_by      uuid,
  cancellation_reason text,

  -- A requested booking that nobody answers should not sit in the queue for
  -- ever. The pg_cron job in phase 6 expires past this.
  expires_at        timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Append-only audit. Every status change writes one row: who, from what, to
-- what, why. This is what makes the customer's timeline renderable and what a
-- dispute is argued from. Never updated, never deleted.
create table if not exists booking_events (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null,
  actor_id    uuid,                  -- null = system (expiry, cron)
  actor_role  text,                  -- 'customer' | 'shop' | 'system' | 'admin'
  from_status booking_status,
  to_status   booking_status,
  note        text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- The shop's private working notes on a job: "customer says it was dropped in
-- water, no corrosion visible", "quoted high, screen is aftermarket". One row
-- per booking.
--
-- A separate table rather than a column on `bookings` because RLS cannot hide
-- one column of a row the customer is allowed to read. `fixer_id` is
-- denormalised so the policy is a plain `owns_shop(fixer_id)` with no join.
create table if not exists booking_notes (
  booking_id  uuid primary key,
  fixer_id    uuid not null,
  body        text not null default '',
  updated_by  uuid,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists booking_attachments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null,
  uploaded_by uuid not null,
  -- Path within the private `booking-attachments` storage bucket, not a URL.
  -- Rendered through a signed URL so a leaked path is not a leaked photo.
  storage_path text not null,
  file_name   text,
  mime_type   text,
  size_bytes  integer,
  kind        text not null default 'fault',   -- 'fault' | 'completion' | 'evidence'
  created_at  timestamptz not null default now()
);

create table if not exists saved_experts (
  user_id    uuid not null,
  fixer_id   uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, fixer_id)
);

-- ─── Messaging ──────────────────────────────────────────────────────────────
--
-- One thread per booking. Threads are not free-standing: a message always has
-- a job it is about, which keeps RLS simple (the two parties on the booking)
-- and stops the inbox becoming a cold-contact channel.
create table if not exists message_threads (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null,
  customer_id uuid not null,
  fixer_id    uuid not null,
  last_message_at timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  thread_id    uuid not null,
  sender_id    uuid not null,
  body         text not null,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists message_attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null,
  storage_path text not null,
  file_name    text,
  mime_type    text,
  size_bytes   integer,
  created_at   timestamptz not null default now()
);

-- ─── Notifications ──────────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  kind       notification_kind not null,
  title      text not null,
  body       text,
  href       text,                    -- where clicking it goes
  booking_id uuid,
  read_at    timestamptz,
  -- Email delivery is queued here and sent by a worker, so a provider outage
  -- degrades to "email is late" rather than "the action failed".
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists notification_prefs (
  user_id            uuid primary key,
  email_bookings     boolean not null default true,
  email_messages     boolean not null default true,
  email_reminders    boolean not null default true,
  email_marketing    boolean not null default false,
  sms_reminders      boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─── Money ──────────────────────────────────────────────────────────────────
--
-- Created now, integrated later. The tables exist so that nothing has to be
-- retrofitted into `bookings` when Stripe lands; until then they simply stay
-- empty. See the plan's phase 7 — holding customer funds between service and
-- payout carries KYC, chargeback and dispute-handling obligations, so the
-- integration is a deliberate, separate decision.
create table if not exists payments (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null,
  customer_id       uuid not null,
  status            payment_status not null default 'pending',

  amount            integer not null,          -- pence, gross
  platform_fee      integer not null default 0,
  tax_amount        integer not null default 0,
  currency          text not null default 'GBP',

  provider          text not null default 'stripe',
  provider_intent_id text,
  provider_charge_id text,

  authorized_at     timestamptz,
  captured_at       timestamptz,
  failed_at         timestamptz,
  failure_reason    text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists refunds (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null,
  booking_id   uuid not null,
  amount       integer not null,        -- pence
  reason       text,
  provider_refund_id text,
  created_by   uuid,
  created_at   timestamptz not null default now()
);

create table if not exists payouts (
  id           uuid primary key default gen_random_uuid(),
  fixer_id     uuid not null,
  status       payout_status not null default 'scheduled',
  amount       integer not null,        -- pence, net of platform fee
  currency     text not null default 'GBP',
  provider_payout_id text,
  scheduled_for timestamptz,
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- Double-entry-ish audit of every money movement. Not the source of truth for
-- Stripe — Stripe is — but the source of truth for what *this* system believes
-- happened, which is what the earnings screen reads.
create table if not exists ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid,
  payment_id  uuid,
  payout_id   uuid,
  fixer_id    uuid,
  customer_id uuid,
  kind        text not null,           -- 'charge' | 'fee' | 'refund' | 'payout' | 'adjustment'
  amount      integer not null,        -- pence; signed
  currency    text not null default 'GBP',
  memo        text,
  created_at  timestamptz not null default now()
);

-- ─── Disputes / warranty claims ─────────────────────────────────────────────
create table if not exists disputes (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null,
  raised_by     uuid not null,
  status        dispute_status not null default 'open',
  reason        text not null,
  desired_outcome text,

  resolution    dispute_resolution,
  resolution_note text,
  refund_amount integer,               -- pence, if resolution refunds
  resolved_by   uuid,                  -- admin_users.id
  resolved_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists dispute_messages (
  id          uuid primary key default gen_random_uuid(),
  dispute_id  uuid not null,
  author_id   uuid,
  author_role text not null default 'customer',  -- 'customer' | 'shop' | 'admin'
  body        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists dispute_evidence (
  id           uuid primary key default gen_random_uuid(),
  dispute_id   uuid not null,
  uploaded_by  uuid not null,
  storage_path text not null,
  file_name    text,
  mime_type    text,
  size_bytes   integer,
  created_at   timestamptz not null default now()
);

-- ─── Expert CRM ─────────────────────────────────────────────────────────────
--
-- Private notes a shop keeps on a repeat customer. RLS restricts these to the
-- shop that wrote them; the customer must never be able to read them.
create table if not exists client_notes (
  id          uuid primary key default gen_random_uuid(),
  fixer_id    uuid not null,
  customer_id uuid not null,
  body        text not null,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 3 — Columns
--
-- Reconciles existing tables. After this phase the shape of every table is
-- known-good and phases 4-6 are safe.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── users grows into a real profile ────────────────────────────────────────
--
-- It has four columns today: id, display_name, avatar_url, created_at. The
-- dashboard needs a contactable, addressable person.
--
-- `display_name` is deliberately kept rather than replaced by `full_name`: the
-- site header, review bylines and the handle_new_user trigger all read it, and
-- renaming it means touching all three for no user-visible gain. full_name is
-- the legal/booking name; display_name is what the site calls you.
alter table users add column if not exists full_name      text;
alter table users add column if not exists phone          text;
alter table users add column if not exists phone_verified boolean not null default false;
alter table users add column if not exists timezone       text not null default 'Europe/London';
alter table users add column if not exists preferred_contact contact_method not null default 'email';
alter table users add column if not exists marketing_opt_in  boolean not null default false;
alter table users add column if not exists onboarded_at   timestamptz;
alter table users add column if not exists updated_at     timestamptz not null default now();

-- ─── fixer_profiles: booking-related settings ───────────────────────────────
alter table fixer_profiles add column if not exists accepts_bookings   boolean not null default true;
alter table fixer_profiles add column if not exists booking_lead_hours integer not null default 2;
alter table fixer_profiles add column if not exists booking_horizon_days integer not null default 60;
alter table fixer_profiles add column if not exists auto_accept        boolean not null default false;
alter table fixer_profiles add column if not exists response_hours     integer not null default 24;
alter table fixer_profiles add column if not exists default_warranty_days integer not null default 3;
alter table fixer_profiles add column if not exists payout_email       citext;
alter table fixer_profiles add column if not exists stripe_account_id  text;

-- The default is 'Asia/Kolkata' (schema.sql:103) while every seeded shop is
-- Europe/London. All slot arithmetic reads this column, so a wrong value is not
-- cosmetic — it shifts every bookable window by five and a half hours.
--
-- Only the default changes here. Existing rows are NOT rewritten: a shop that
-- genuinely is in Kolkata would be silently relocated by a blanket update, and
-- this file cannot tell the difference between a deliberate value and an
-- inherited default. Correct existing rows by hand if any are wrong:
--   update fixer_profiles set timezone = 'Europe/London' where timezone = 'Asia/Kolkata';
alter table fixer_profiles alter column timezone set default 'Europe/London';

-- ─── reviews become verifiable ──────────────────────────────────────────────
--
-- Nullable on purpose. The 40 seeded reviews have no booking and must survive;
-- they render as unverified. New reviews written through the app carry the
-- booking they came from, and the UI can then show a "verified booking" mark
-- that actually means something.
alter table reviews add column if not exists booking_id uuid;

-- ─── This file's own tables, for databases made from an earlier revision ────
alter table shop_services add column if not exists warranty_days integer not null default 3;
alter table bookings      add column if not exists platform_fee  integer not null default 0;
alter table bookings      add column if not exists tax_amount    integer not null default 0;
alter table bookings      add column if not exists expires_at    timestamptz;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 4 — Constraints
--
-- Foreign keys are added by name here rather than inline in phase 2, so that
-- re-running never leaves two identical constraints under different names.
-- Each is wrapped because `add constraint` has no `if not exists`.
-- ════════════════════════════════════════════════════════════════════════════

do $$ begin
  alter table shop_claims add constraint shop_claims_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_claims add constraint shop_claims_user_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table user_addresses add constraint user_addresses_user_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_services add constraint shop_services_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_services add constraint shop_services_category_fkey
    foreign key (category_id) references repair_categories (id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_availability add constraint shop_availability_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_time_off add constraint shop_time_off_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table bookings add constraint bookings_customer_fkey
    foreign key (customer_id) references auth.users (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table bookings add constraint bookings_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- set null, not cascade: deleting a service must not delete the history of
-- work done under it. The booking keeps its snapshot price and notes.
do $$ begin
  alter table bookings add constraint bookings_service_fkey
    foreign key (service_id) references shop_services (id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table booking_events add constraint booking_events_booking_fkey
    foreign key (booking_id) references bookings (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table booking_notes add constraint booking_notes_booking_fkey
    foreign key (booking_id) references bookings (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table booking_notes add constraint booking_notes_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table booking_attachments add constraint booking_attachments_booking_fkey
    foreign key (booking_id) references bookings (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table saved_experts add constraint saved_experts_user_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table saved_experts add constraint saved_experts_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table message_threads add constraint message_threads_booking_fkey
    foreign key (booking_id) references bookings (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table messages add constraint messages_thread_fkey
    foreign key (thread_id) references message_threads (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table message_attachments add constraint message_attachments_message_fkey
    foreign key (message_id) references messages (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table notifications add constraint notifications_user_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table notification_prefs add constraint notification_prefs_user_fkey
    foreign key (user_id) references auth.users (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table payments add constraint payments_booking_fkey
    foreign key (booking_id) references bookings (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table refunds add constraint refunds_payment_fkey
    foreign key (payment_id) references payments (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table payouts add constraint payouts_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table disputes add constraint disputes_booking_fkey
    foreign key (booking_id) references bookings (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table dispute_messages add constraint dispute_messages_dispute_fkey
    foreign key (dispute_id) references disputes (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table dispute_evidence add constraint dispute_evidence_dispute_fkey
    foreign key (dispute_id) references disputes (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table client_notes add constraint client_notes_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table client_notes add constraint client_notes_customer_fkey
    foreign key (customer_id) references auth.users (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- reviews.booking_id — set null so deleting a booking does not delete the
-- review; it only stops it claiming to be verified.
do $$ begin
  alter table reviews add constraint reviews_booking_fkey
    foreign key (booking_id) references bookings (id) on delete set null;
exception when duplicate_object then null; end $$;


-- ─── Value checks ───────────────────────────────────────────────────────────

do $$ begin
  alter table shop_services add constraint shop_services_price_sane
    check (
      (price_min is null or price_min >= 0) and
      (price_max is null or price_max >= 0) and
      (price_min is null or price_max is null or price_max >= price_min)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_services add constraint shop_services_duration_sane
    check (duration_minutes between 5 and 1440);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_availability add constraint shop_availability_window_sane
    check (ends_at > starts_at and buffer_minutes >= 0 and capacity >= 1);
exception when duplicate_object then null; end $$;

-- A booking must occupy real time. An empty or backwards range would also slip
-- past the overlap constraint, since an empty range overlaps nothing.
do $$ begin
  alter table bookings add constraint bookings_slot_not_empty
    check (not isempty(slot) and lower(slot) is not null and upper(slot) is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table bookings add constraint bookings_amounts_sane
    check (
      (quoted_amount is null or quoted_amount >= 0) and
      (final_amount  is null or final_amount  >= 0) and
      platform_fee >= 0 and tax_amount >= 0
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table payments add constraint payments_amount_positive check (amount > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table refunds add constraint refunds_amount_positive check (amount > 0);
exception when duplicate_object then null; end $$;


-- ─── Uniques ────────────────────────────────────────────────────────────────

create unique index if not exists bookings_reference_key on bookings (reference);

-- One approved owner per shop. Partial, so rejected and withdrawn claims can
-- pile up freely and a shop can be re-claimed after an owner leaves.
create unique index if not exists shop_claims_one_approved
  on shop_claims (fixer_id) where (status = 'approved');

-- One open claim per person per shop, so a double-submitted form does not
-- create two pending rows for the reviewer to adjudicate.
create unique index if not exists shop_claims_one_pending
  on shop_claims (fixer_id, user_id) where (status = 'pending');

create unique index if not exists shop_availability_unique_window
  on shop_availability (fixer_id, weekday, starts_at, ends_at);

create unique index if not exists message_threads_booking_key
  on message_threads (booking_id);

-- One default address per user.
create unique index if not exists user_addresses_one_default
  on user_addresses (user_id) where (is_default);

-- One review per booking. The existing (fixer_id, customer_id) unique from
-- schema.sql still holds; this adds the per-booking rule for verified reviews
-- and ignores the seeded rows, which have a null booking_id.
create unique index if not exists reviews_one_per_booking
  on reviews (booking_id) where (booking_id is not null);


-- ─── THE constraint: no double-booking ──────────────────────────────────────
--
-- This is the load-bearing rule of the whole system, and it belongs in the
-- database rather than in application code. The application cannot get it
-- right: checking "is this slot free" and then inserting is a read-modify-write
-- with a window between the two, and two requests landing in that window both
-- see a free slot and both write. No amount of care in TypeScript closes it.
--
-- Postgres closes it at the index. Two concurrent transactions confirming the
-- same slot: one commits, the other raises 23P01 (exclusion_violation), which
-- the server action turns into "that slot was just taken".
--
-- `requested` is deliberately NOT in the predicate. Several customers may ask
-- for the same time and the shop picks one — blocking the slot on request would
-- let anyone freeze a shop's calendar by requesting every slot and never paying.
-- Only states where the shop has actually committed hold the slot.
--
-- Requires btree_gist (phase 1) for the `fixer_id with =` operator class.
--
-- Not wrapped in a bare `exception when duplicate_object` like the foreign keys
-- above, because an exclusion constraint does not fail the same way. Postgres
-- builds the backing index *before* it checks the constraint name, so on a
-- re-run the index name collides first and it raises 42P07 duplicate_table —
-- which `when duplicate_object` (42710, specifically) does not catch. That is
-- what aborted the previous run of this file.
--
-- Catching 42P07 alone would be worse than the bug: an index of this name left
-- behind without its constraint would be swallowed silently, and the database
-- would accept double bookings with nothing to say so. So the two cases are
-- separated — constraint already present is success, index-without-constraint
-- is a loud warning.
do $$
declare
  bookings_oid   oid := to_regclass('public.bookings');
  has_constraint boolean := false;
  has_relation   boolean := false;
begin
  if bookings_oid is null then
    raise warning 'bookings_no_overlap NOT created: public.bookings does not exist.';
    return;
  end if;

  select exists (
    select 1
      from pg_catalog.pg_constraint
     where conname = 'bookings_no_overlap'
       and conrelid = bookings_oid
  ) into has_constraint;

  -- Already in place from an earlier run. Nothing to do, and nothing to report.
  if has_constraint then
    return;
  end if;

  select exists (
    select 1
      from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'bookings_no_overlap'
  ) into has_relation;

  if has_relation then
    raise warning 'bookings_no_overlap NOT created: a relation of that name already exists but is not a constraint on public.bookings. Double bookings are NOT being prevented. Inspect it, then drop it and re-run: drop index if exists public.bookings_no_overlap;';
    return;
  end if;

  alter table bookings add constraint bookings_no_overlap
    exclude using gist (fixer_id with =, slot with &&)
    where (status in ('confirmed', 'in_progress'));

exception
  -- Backstop only: another session could win the race between the checks above
  -- and the ALTER. Both codes are listed because either can surface here.
  when duplicate_table or duplicate_object then null;
  -- A pre-existing database may already hold overlapping rows, in which case
  -- the constraint cannot be built. Say so loudly rather than failing the run.
  when exclusion_violation then
    raise warning 'bookings_no_overlap NOT created: existing rows overlap. Resolve them, then re-run.';
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 5 — Indexes
--
-- Every one of these backs a query the dashboards actually make.
-- ════════════════════════════════════════════════════════════════════════════

-- "my bookings, newest first" — the customer dashboard's main list
create index if not exists bookings_customer_idx
  on bookings (customer_id, created_at desc);

-- "my shop's bookings by status" — the expert request queue and schedule
create index if not exists bookings_fixer_status_idx
  on bookings (fixer_id, status, created_at desc);

-- Range queries: "what is on for this shop this week". GiST because the
-- operator is && , which btree cannot serve.
create index if not exists bookings_slot_idx on bookings using gist (slot);

-- The expiry cron scans this.
create index if not exists bookings_expires_idx
  on bookings (expires_at) where (status = 'requested');

-- The warranty-close cron scans this.
create index if not exists bookings_warranty_idx
  on bookings (warranty_expires_at) where (status = 'completed');

create index if not exists booking_events_booking_idx
  on booking_events (booking_id, created_at);

create index if not exists booking_attachments_booking_idx
  on booking_attachments (booking_id);

create index if not exists shop_services_fixer_idx
  on shop_services (fixer_id, sort_order) where (is_active);

create index if not exists shop_availability_fixer_idx
  on shop_availability (fixer_id, weekday);

create index if not exists shop_time_off_period_idx
  on shop_time_off using gist (period);

create index if not exists shop_claims_user_idx   on shop_claims (user_id, status);
create index if not exists shop_claims_status_idx on shop_claims (status, created_at desc);

create index if not exists messages_thread_idx on messages (thread_id, created_at);
create index if not exists message_threads_customer_idx on message_threads (customer_id, last_message_at desc);
create index if not exists message_threads_fixer_idx    on message_threads (fixer_id, last_message_at desc);

-- The notification bell's unread count.
create index if not exists notifications_unread_idx
  on notifications (user_id, created_at desc) where (read_at is null);

create index if not exists payments_booking_idx on payments (booking_id);
create index if not exists payouts_fixer_idx    on payouts (fixer_id, created_at desc);
create index if not exists ledger_fixer_idx     on ledger_entries (fixer_id, created_at desc);
create index if not exists disputes_booking_idx on disputes (booking_id);
create index if not exists disputes_status_idx  on disputes (status, created_at desc);
create index if not exists client_notes_idx     on client_notes (fixer_id, customer_id);
create index if not exists saved_experts_user_idx on saved_experts (user_id, created_at desc);
create index if not exists user_addresses_user_idx on user_addresses (user_id);
create index if not exists reviews_booking_idx on reviews (booking_id) where (booking_id is not null);


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 5b — Lock every new table
--
-- This has to happen HERE, in the same file as the tables, not in
-- policies-marketplace.sql.
--
-- `create table` in the SQL editor leaves RLS *off*. Only tables created
-- through the dashboard's Table Editor get it switched on for you. And a fresh
-- Supabase project grants `anon` and `authenticated` full DML on everything in
-- `public` by default. So between running this migration and running the
-- policies file, every one of these tables — bookings, messages, payments,
-- disputes — would be readable and writable by anyone holding the anon key,
-- which ships in the browser bundle.
--
-- RLS on with zero policies denies everything instead. That is the safe state
-- to be in while the policies are still being applied: locked by default, then
-- opened deliberately, one policy at a time.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  t text;
begin
  foreach t in array array[
    'shop_claims', 'user_addresses', 'shop_services', 'shop_availability',
    'shop_time_off', 'bookings', 'booking_events', 'booking_notes',
    'booking_attachments', 'saved_experts', 'message_threads', 'messages',
    'message_attachments', 'notifications', 'notification_prefs',
    'payments', 'refunds', 'payouts', 'ledger_entries',
    'disputes', 'dispute_messages', 'dispute_evidence', 'client_notes'
  ]
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- PHASE 6 — Functions and triggers
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Booking reference ──────────────────────────────────────────────────────
--
-- Human-quotable on the phone: FIX-7Q2M4X. Deliberately not a uuid (nobody
-- reads one aloud) and deliberately not sequential (a sequence leaks how many
-- bookings the platform has taken, and lets anyone guess a neighbouring one).
--
-- The alphabet omits I, O, 0, 1 — the characters people mishear and mistype.
--
-- `security definer` is load-bearing, not boilerplate. The collision probe below
-- has to see every booking, and phase 5b turns RLS on: under the caller's own
-- policies a customer sees only their own rows, so the probe would report a
-- reference as free when another customer already holds it. The loop would exit
-- satisfied, the insert would hit bookings_reference_key, and the caller would
-- get 23505 — with the retry loop and the 10-attempt guard both inert, unable
-- to observe the collision they exist to handle.
create or replace function generate_booking_reference()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  attempt   integer := 0;
begin
  loop
    candidate := 'FIX-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    exit when not exists (select 1 from bookings where reference = candidate);

    attempt := attempt + 1;
    -- 32^6 is a billion combinations; ten collisions means something is wrong
    -- with random(), not with luck.
    if attempt > 10 then
      raise exception 'could not generate a unique booking reference after % attempts', attempt;
    end if;
  end loop;

  return candidate;
end;
$$;

create or replace function bookings_set_reference()
returns trigger
language plpgsql
as $$
begin
  if new.reference is null or btrim(new.reference) = '' then
    new.reference := generate_booking_reference();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_reference_trigger on bookings;
create trigger bookings_reference_trigger
  before insert on bookings
  for each row execute function bookings_set_reference();

-- ─── updated_at ─────────────────────────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'shop_claims', 'shop_services', 'bookings', 'booking_notes',
    'notification_prefs', 'payments', 'disputes', 'client_notes'
  ]
  loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format(
      'create trigger %I_touch before update on %I for each row execute function touch_updated_at()',
      t, t
    );
  end loop;
end $$;

-- ─── Lifecycle bookkeeping ──────────────────────────────────────────────────
--
-- Stamps the transition timestamps and opens the warranty window, so no caller
-- can forget to. The application decides *whether* a transition is legal
-- (src/lib/bookings/machine.ts); this decides what it implies.
create or replace function bookings_stamp_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'accepted'  then new.responded_at := coalesce(new.responded_at, now());
      when 'declined'  then new.responded_at := coalesce(new.responded_at, now());
      when 'confirmed' then new.confirmed_at := coalesce(new.confirmed_at, now());
      when 'in_progress' then new.started_at := coalesce(new.started_at, now());
      when 'completed' then
        new.completed_at := coalesce(new.completed_at, now());
        -- The warranty window opens here. This is the trigger for the
        -- customer's right to raise a claim, so it must be set by the database
        -- rather than trusted from the client.
        new.warranty_expires_at := coalesce(
          new.warranty_expires_at,
          now() + make_interval(days => greatest(new.warranty_days, 0))
        );
      when 'closed' then new.closed_at := coalesce(new.closed_at, now());
      when 'cancelled_customer' then new.cancelled_at := coalesce(new.cancelled_at, now());
      when 'cancelled_shop'     then new.cancelled_at := coalesce(new.cancelled_at, now());
      else null;
    end case;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_stamp_trigger on bookings;
create trigger bookings_stamp_trigger
  before update on bookings
  for each row execute function bookings_stamp_transition();

-- ─── Audit every status change ──────────────────────────────────────────────
--
-- After-trigger, so it records what actually committed. The actor is read from
-- the JWT where there is one; a cron job or service-role call records null,
-- which reads as 'system'.
--
-- `actor_role` must be one of 'customer' | 'shop' | 'system' | 'admin' — the
-- column comment above says so, and the timeline UI switches on exactly those
-- four to decide whether a row reads "You", "The shop" or "Our team". The
-- column is plain `text`, so a fifth value would be accepted silently here and
-- surface as a who-less line in the app. Hence: derive it by comparing the
-- caller to the two parties on the booking, and never invent a label.
create or replace function bookings_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
  v_role  text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;

  if v_actor is null then
    v_role := 'system';
  elsif v_actor = new.customer_id then
    v_role := 'customer';
  else
    select owner_id into v_owner from fixer_profiles where id = new.fixer_id;
    -- Anyone acting who is neither party is staff: only an admin gets past
    -- RLS on someone else's booking in the first place.
    v_role := case when v_actor = v_owner then 'shop' else 'admin' end;
  end if;

  insert into booking_events (booking_id, actor_id, actor_role, from_status, to_status, note)
  values (
    new.id,
    v_actor,
    v_role,
    case when tg_op = 'INSERT' then null else old.status end,
    new.status,
    case when tg_op = 'INSERT' then 'Booking requested' else null end
  );

  return null;   -- after-trigger; return value is ignored
end;
$$;

drop trigger if exists bookings_audit_trigger on bookings;
create trigger bookings_audit_trigger
  after insert or update on bookings
  for each row execute function bookings_log_event();

-- ─── Thread per booking ─────────────────────────────────────────────────────
--
-- Created with the booking so the message screen never has to deal with "no
-- thread yet" as a state.
create or replace function bookings_open_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into message_threads (booking_id, customer_id, fixer_id)
  values (new.id, new.customer_id, new.fixer_id)
  on conflict (booking_id) do nothing;
  return null;
end;
$$;

drop trigger if exists bookings_thread_trigger on bookings;
create trigger bookings_thread_trigger
  after insert on bookings
  for each row execute function bookings_open_thread();

-- Keeps the thread list sorted by recency without the inbox having to aggregate
-- over messages on every read.
--
-- `security definer` for the same reason as generate_booking_reference: this
-- writes to a SECOND table, and message_threads has no UPDATE policy — only
-- "parties read own threads" for SELECT. As SECURITY INVOKER the UPDATE would be
-- filtered to zero rows for every ordinary caller and fail silently, leaving
-- last_message_at frozen at thread creation while messages accumulated. The
-- other cross-table trigger functions here (bookings_log_event,
-- bookings_open_thread, shop_claims_apply, ensure_notification_prefs) all carry
-- it; this one was the outlier. It only ever touches the thread named by the row
-- just inserted, so it needs no policy of its own.
create or replace function messages_touch_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update message_threads set last_message_at = new.created_at where id = new.thread_id;
  return null;
end;
$$;

drop trigger if exists messages_touch_thread_trigger on messages;
create trigger messages_touch_thread_trigger
  after insert on messages
  for each row execute function messages_touch_thread();

-- ─── Claim approval sets ownership ──────────────────────────────────────────
--
-- The single point where a shop gains an owner. Doing it in a trigger rather
-- than in admin code means the two can never disagree.
create or replace function shop_claims_apply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update fixer_profiles set owner_id = new.user_id where id = new.fixer_id;
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists shop_claims_apply_trigger on shop_claims;
create trigger shop_claims_apply_trigger
  before update on shop_claims
  for each row execute function shop_claims_apply();

-- ─── Notification preferences exist for everyone ────────────────────────────
create or replace function ensure_notification_prefs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notification_prefs (user_id) values (new.id) on conflict (user_id) do nothing;
  return null;
end;
$$;

drop trigger if exists users_prefs_trigger on users;
create trigger users_prefs_trigger
  after insert on users
  for each row execute function ensure_notification_prefs();

-- Backfill for everyone who signed up before this file existed.
insert into notification_prefs (user_id)
select id from users on conflict (user_id) do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- Scheduled work — NOT created here
--
-- Two jobs are needed and both are deliberately left out of this file:
--
--   1. Expire `requested` bookings past expires_at
--   2. Close `completed` bookings past warranty_expires_at
--
-- They need pg_cron, which is enabled per-project in the Supabase dashboard
-- (Database → Extensions) rather than from a migration, and scheduling them
-- against a database where the extension is missing fails the whole run. The
-- functions they call are below; wire them up once pg_cron is on:
--
--   select cron.schedule('expire-bookings',  '*/15 * * * *', 'select expire_stale_bookings()');
--   select cron.schedule('close-warranties', '7 * * * *',    'select close_expired_warranties()');
-- ════════════════════════════════════════════════════════════════════════════

create or replace function expire_stale_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched integer;
begin
  update bookings
     set status = 'expired'
   where status = 'requested'
     and expires_at is not null
     and expires_at < now();

  get diagnostics touched = row_count;
  return touched;
end;
$$;

create or replace function close_expired_warranties()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  touched integer;
begin
  -- Only bookings with no open dispute. A claim raised inside the window keeps
  -- the booking open until it is resolved, which is the entire point of the
  -- warranty period.
  update bookings b
     set status = 'closed'
   where b.status = 'completed'
     and b.warranty_expires_at is not null
     and b.warranty_expires_at < now()
     and not exists (
       select 1 from disputes d
        where d.booking_id = b.id
          and d.status not in ('resolved', 'withdrawn')
     );

  get diagnostics touched = row_count;
  return touched;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- Done. Next: policies-marketplace.sql — nothing above is reachable from the
-- app until RLS policies exist, because PHASE 5b turns RLS on for all 23 tables
-- and RLS with no policies denies everything. That is the safe order: locked
-- first, opened deliberately.
--
-- Do not skip PHASE 5b, and do not assume it is redundant. `create table` run
-- from the SQL editor leaves RLS *off* — Supabase only switches it on for
-- tables created through the Table Editor UI — and a default project grants
-- `anon` full DML on the public schema. Without that block these tables are
-- readable and writable by anyone with the anon key, which ships in the
-- browser bundle.
-- ════════════════════════════════════════════════════════════════════════════
