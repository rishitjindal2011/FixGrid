-- ════════════════════════════════════════════════════════════════════════════
-- Diagnose a preflight 0c collision
--
-- Run this when 001_marketplace.sql aborts with
--
--   Preflight 0c — a relation this migration creates already exists with the
--   wrong shape:
--     • public.messages has no "thread_id" column (expected uuid)
--
-- It answers the only question that matters before you touch anything: what IS
-- that table, does it hold anything, and is anything else relying on it?
--
-- Paste the whole file into the Supabase SQL Editor and run it. Read-only — it
-- creates, alters and drops nothing. To diagnose a different table, change the
-- name in the `target` CTE on the next line.
-- ════════════════════════════════════════════════════════════════════════════

with target as (
  select 'messages'::text as name          -- ← the colliding table
),

-- What kind of object is it? A view cannot be reshaped into a table at all.
obj as (
  select 1 as ord,
         'object' as kind,
         c.relname::text as detail,
         case c.relkind
           when 'r' then 'ordinary table'
           when 'p' then 'partitioned table'
           when 'v' then 'VIEW — cannot be altered into a table'
           when 'm' then 'MATERIALIZED VIEW — cannot be altered into a table'
           when 'f' then 'foreign table'
           else 'relkind=' || c.relkind::text
         end as extra
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join target t on t.name = c.relname::text
   where n.nspname = 'public'
),

-- Its real shape, in declaration order. Compare this against what the migration
-- expects: messages needs id, thread_id uuid, sender_id, body, read_at,
-- created_at.
cols as (
  select 2 as ord,
         'column' as kind,
         a.attname::text as detail,
         format_type(a.atttypid, a.atttypmod)
           || case when a.attnotnull then ' not null' else '' end as extra
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join target t on t.name = c.relname::text
   where n.nspname = 'public'
     and a.attnum > 0
     and not a.attisdropped
),

-- Anything pointing AT it. These are what `drop ... cascade` would destroy.
fks as (
  select 3 as ord,
         'incoming FK' as kind,
         con.conname::text as detail,
         'from public.' || src.relname::text as extra
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class src on src.oid = con.conrelid
    join pg_catalog.pg_class tgt on tgt.oid = con.confrelid
    join pg_catalog.pg_namespace n on n.oid = tgt.relnamespace
    join target t on t.name = tgt.relname::text
   where n.nspname = 'public' and con.contype = 'f'
),

-- Views built on it. `drop ... cascade` takes these too.
-- distinct: a view referencing four columns of the table produces four pg_depend
-- rows. The classid filters matter too — without them an objid that happens to
-- equal some rewrite rule's oid in a different catalog joins through and reports
-- a view that does not depend on this table at all.
views as (
  select distinct
         4 as ord,
         'depending view' as kind,
         v.relname::text as detail,
         'would be dropped by drop ... cascade' as extra
    from pg_catalog.pg_depend d
    join pg_catalog.pg_rewrite r on r.oid = d.objid
    join pg_catalog.pg_class v on v.oid = r.ev_class
    join pg_catalog.pg_class s on s.oid = d.refobjid
    join pg_catalog.pg_namespace sn on sn.oid = s.relnamespace
    join target t on t.name = s.relname::text
   where sn.nspname = 'public'
     and d.classid = 'pg_catalog.pg_rewrite'::regclass
     and d.refclassid = 'pg_catalog.pg_class'::regclass
     and v.oid <> s.oid
),

-- Index and constraint names that would survive a RENAME and then collide with
-- the ones this migration creates. The reason `set schema` is the better move.
idx as (
  select 5 as ord,
         'index' as kind,
         i.relname::text as detail,
         'stays in public if you RENAME the table' as extra
    from pg_catalog.pg_index x
    join pg_catalog.pg_class i on i.oid = x.indexrelid
    join pg_catalog.pg_class c on c.oid = x.indrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join target t on t.name = c.relname::text
   where n.nspname = 'public'
),

-- Live row estimate from the planner's statistics. Cheap, and enough to tell an
-- empty leftover from a table with real data. -1 means it has never been
-- analysed — confirm with the exact count below.
est as (
  select 6 as ord,
         'row estimate' as kind,
         c.reltuples::bigint::text as detail,
         'planner estimate; confirm with the exact count below' as extra
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join target t on t.name = c.relname::text
   where n.nspname = 'public'
)

select kind, detail, extra
  from (
    select * from obj
    union all select * from cols
    union all select * from fks
    union all select * from views
    union all select * from idx
    union all select * from est
  ) report
 order by ord, detail;


-- ════════════════════════════════════════════════════════════════════════════
-- Confirm the exact contents before deciding
--
--     select count(*) from public.messages;
--     select * from public.messages limit 5;
--
-- ── Then choose ─────────────────────────────────────────────────────────────
--
-- Empty, no incoming FKs, no depending views  → a leftover from an earlier
-- draft. Drop it and re-run the migration:
--
--     drop table public.messages cascade;
--
-- Holds rows you care about  → move it out of the way, schema and all:
--
--     create schema if not exists legacy;
--     alter table public.messages set schema legacy;
--
-- Use `set schema`, not `rename`. Renaming a table leaves its indexes and
-- constraints behind in public under their old names, so `messages_pkey` would
-- still be taken when this migration creates its own `messages` table, and the
-- run would fail with 42P07 relation already exists. `set schema` moves the
-- indexes with the table.
--
-- It is a VIEW or MATERIALIZED VIEW  → `drop view public.messages;` (or
-- `drop materialized view public.messages;`). A view cannot be reshaped into a
-- table.
--
-- Re-run 001_marketplace.sql afterwards. Preflight 0c re-checks all 23 tables
-- and 74 columns on every run, so if anything else collides it will say so
-- before writing a single row.
-- ════════════════════════════════════════════════════════════════════════════
