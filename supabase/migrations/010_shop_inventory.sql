-- ════════════════════════════════════════════════════════════════════════════
-- 010 — Shop inventory
--
-- Parts and stock a shop sells over the counter, as opposed to `shop_services`,
-- which is labour booked into a diary. The two are deliberately separate
-- tables: a service has a duration, delivery modes and a warranty; an item has
-- a quantity, a supplier code and a shelf. Folding them together would mean a
-- nullable half on every row and a UI that has to ask which kind it is holding.
--
-- ─── This table already existed ─────────────────────────────────────────────
--
-- A legacy `shop_inventory` was created before the marketplace migrations:
--
--     id, fixer_id, name, stock int, threshold int, price numeric, created_at
--
-- It was never referenced by any of the three apps, and `009_security_hardening`
-- revoked every write on it. It is reshaped here rather than dropped, because
-- dropping a table is not something a migration should do to data it did not
-- create — even when, as here, the row count is zero on this database. The
-- three legacy columns are carried across, not discarded:
--
--     stock     → quantity
--     threshold → low_stock_threshold
--     price     → unit_price, numeric pounds converted to integer pence
--
-- `price numeric` is the reason a straight rename will not do. Money in this
-- schema is integer minor units everywhere (see src/lib/format.ts); a numeric
-- pounds column on one table is how a rounding bug gets in.
--
-- Every step is guarded so this file is safe to run twice.
-- ════════════════════════════════════════════════════════════════════════════


-- ─── PHASE 1 · Enum ─────────────────────────────────────────────────────────

do $$ begin
  create type inventory_condition as enum ('new', 'refurbished', 'used');
exception when duplicate_object then null; end $$;


-- ─── PHASE 2 · The table, if it is not the legacy one ───────────────────────
--
-- `if not exists` covers a fresh database. On this one the table is already
-- present and phase 3 does the work.

create table if not exists shop_inventory (
  id          uuid primary key default gen_random_uuid(),
  fixer_id    uuid not null,
  name        text not null,
  created_at  timestamptz not null default now()
);


-- ─── PHASE 3 · Columns ──────────────────────────────────────────────────────

alter table shop_inventory
  -- The item ID a customer quotes down the phone and the owner searches by.
  -- Owner-supplied and free-form — shops already have their own part numbering
  -- and forcing a generated code on them would mean maintaining two. Unique
  -- per shop, case-insensitively (phase 6), so "SCR-14P" and "scr-14p" cannot
  -- both exist and point at different shelves.
  add column if not exists sku                 text,
  add column if not exists description         text,
  add column if not exists category_id         uuid,
  add column if not exists brand               text,
  add column if not exists condition           inventory_condition not null default 'new',

  -- Pence. Nullable: an item priced on request is a real state, and storing 0
  -- for it would advertise "free" on the public page.
  add column if not exists unit_price          integer,
  add column if not exists currency            text not null default 'GBP',

  add column if not exists quantity            integer not null default 0,

  -- The count at or below which the dashboard flags the row. 0 disables the
  -- warning without hiding the item.
  add column if not exists low_stock_threshold integer not null default 0,

  -- Whether it appears on the public page at all. Distinct from quantity: an
  -- item can be listed and out of stock, which is worth showing, and it can be
  -- in stock and unlisted, which is a draft.
  add column if not exists is_active           boolean not null default true,
  add column if not exists sort_order          integer not null default 0,
  add column if not exists updated_at          timestamptz not null default now();


-- ─── PHASE 4 · Carry the legacy columns across, then retire them ────────────
--
-- Runs only while the old column is still present, so a second execution is a
-- no-op rather than a second copy.

do $$
declare
  has_stock     boolean;
  has_threshold boolean;
  has_price     boolean;
begin
  select
    count(*) filter (where column_name = 'stock')     > 0,
    count(*) filter (where column_name = 'threshold') > 0,
    count(*) filter (where column_name = 'price')     > 0
    into has_stock, has_threshold, has_price
  from information_schema.columns
  where table_schema = 'public' and table_name = 'shop_inventory';

  if has_stock then
    execute 'update shop_inventory set quantity = stock where stock is not null';
    execute 'alter table shop_inventory drop column stock';
  end if;

  if has_threshold then
    execute 'update shop_inventory set low_stock_threshold = threshold where threshold is not null';
    execute 'alter table shop_inventory drop column threshold';
  end if;

  if has_price then
    -- Pounds to pence, rounded once and explicitly. A price of 0 becomes null:
    -- the legacy column had `default 0` and no way to say "ask us", so every
    -- zero in it is an absent price rather than a free item.
    execute $sql$
      update shop_inventory
         set unit_price = case when price > 0 then round(price * 100)::integer end
       where price is not null
    $sql$;
    execute 'alter table shop_inventory drop column price';
  end if;
end $$;


-- ─── PHASE 5 · Constraints ──────────────────────────────────────────────────

do $$ begin
  alter table shop_inventory add constraint shop_inventory_fixer_fkey
    foreign key (fixer_id) references fixer_profiles (id) on delete cascade;
exception when duplicate_object then null; end $$;

-- set null, not cascade: deleting a category must not delete the stock filed
-- under it.
do $$ begin
  alter table shop_inventory add constraint shop_inventory_category_fkey
    foreign key (category_id) references repair_categories (id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_inventory add constraint shop_inventory_quantity_sane
    check (quantity >= 0 and quantity <= 1000000);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_inventory add constraint shop_inventory_threshold_sane
    check (low_stock_threshold >= 0 and low_stock_threshold <= 1000000);
exception when duplicate_object then null; end $$;

-- Ten thousand pounds. High enough for any part a repair shop stocks, low
-- enough that a misplaced decimal is caught rather than published.
do $$ begin
  alter table shop_inventory add constraint shop_inventory_price_sane
    check (unit_price is null or (unit_price >= 0 and unit_price <= 1000000));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table shop_inventory add constraint shop_inventory_name_shape
    check (length(btrim(name)) between 1 and 160);
exception when duplicate_object then null; end $$;

-- Empty string is not a SKU. Without this, three items with `sku = ''` would
-- collide on the unique index below and the third insert would fail with a
-- message about a duplicate item ID the owner never typed.
do $$ begin
  alter table shop_inventory add constraint shop_inventory_sku_shape
    check (sku is null or length(btrim(sku)) between 1 and 64);
exception when duplicate_object then null; end $$;


-- ─── PHASE 6 · Indexes ──────────────────────────────────────────────────────

-- The item ID is unique within a shop, not across the platform: two shops may
-- both stock a part they each call "SCR-14P". `lower()` because an owner
-- searching for their own code should not have to remember how they cased it.
create unique index if not exists shop_inventory_sku_key
  on shop_inventory (fixer_id, lower(btrim(sku))) where (sku is not null);

-- The dashboard list: every row the shop owns, in its stored order.
create index if not exists shop_inventory_fixer_idx
  on shop_inventory (fixer_id, sort_order, name);

-- The public panel: listed rows only.
create index if not exists shop_inventory_public_idx
  on shop_inventory (fixer_id, sort_order, name) where (is_active);

-- Name search. pg_trgm is already installed (schema.sql), and this keeps an
-- `ilike '%…%'` off a sequential scan once a shop stocks hundreds of parts.
do $$ begin
  create index if not exists shop_inventory_name_trgm
    on shop_inventory using gin (name gin_trgm_ops);
exception when undefined_object then null; end $$;


-- ─── PHASE 7 · updated_at ───────────────────────────────────────────────────
--
-- Reuses `touch_updated_at()` from 001 rather than declaring a second one.

drop trigger if exists shop_inventory_touch on shop_inventory;
create trigger shop_inventory_touch
  before update on shop_inventory
  for each row execute function touch_updated_at();


-- ─── PHASE 8 · RLS ──────────────────────────────────────────────────────────

alter table shop_inventory enable row level security;

-- The two legacy policies go. Both keyed on `fixer_profiles.user_id`, which is
-- not the column ownership is decided by anywhere else in this schema —
-- `owns_shop()` reads `owner_id`, and so does every server action. A shop
-- transferred to a new owner would have kept answering to the old one.
drop policy if exists "Fixers can manage inventory" on shop_inventory;
drop policy if exists "Public read inventory" on shop_inventory;

-- Anonymous read, because the stock list renders on `/expert/[slug]` to a
-- visitor who has not signed in. Unlisted rows stay private: a shop pricing up
-- next month's stock is not publishing a price list.
drop policy if exists "listed inventory readable by all" on shop_inventory;
create policy "listed inventory readable by all"
  on shop_inventory for select
  using (is_active);

-- `for all` covers select, which is how an owner sees their own unlisted rows.
-- Permissive policies OR together, so the two coexist.
drop policy if exists "owner manages own inventory" on shop_inventory;
create policy "owner manages own inventory"
  on shop_inventory for all
  to authenticated
  using (owns_shop(fixer_id))
  with check (owns_shop(fixer_id));


-- ─── PHASE 9 · Grants ───────────────────────────────────────────────────────
--
-- 009 revoked insert/update/delete from both roles while this table was
-- unreferenced legacy. It is referenced now, so the writes come back —
-- to `authenticated` only, and still filtered by the policies above.

grant select on shop_inventory to anon;
grant select, insert, update, delete on shop_inventory to authenticated;
revoke insert, update, delete on shop_inventory from anon;


-- ─── Verifying ──────────────────────────────────────────────────────────────
--
--   select column_name, data_type from information_schema.columns
--    where table_name = 'shop_inventory' order by ordinal_position;
--   -- expect no `stock`, `threshold` or `price`
--
--   select polname, polcmd from pg_policy
--    where polrelid = 'public.shop_inventory'::regclass;
--   -- expect exactly two, neither of them the legacy pair
