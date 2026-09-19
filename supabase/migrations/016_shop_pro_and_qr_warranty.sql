-- ════════════════════════════════════════════════════════════════════════════
-- 016 — Shop Pro SaaS (₹999/month) & QR Warranty Passport
--
-- 1. Adds Pro tier columns to `fixer_profiles` for priority search placement,
--    automated customer alerts, and smart inventory management.
-- 2. Adds cryptographic passport tracking to `bookings` for tamper-proof
--    QR warranty verification.
-- 3. Ensures the `shop_pro` plan is seeded in `subscription_plans`.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Fixer Profiles Pro Tier ─────────────────────────────────────────────

alter table fixer_profiles
  add column if not exists is_pro boolean not null default false,
  add column if not exists pro_expires_at timestamptz;

create index if not exists idx_fixer_profiles_pro
  on fixer_profiles (is_pro, pro_expires_at)
  where is_pro = true;


-- ─── 2. Bookings QR Warranty Passport ───────────────────────────────────────

alter table bookings
  add column if not exists qr_passport_hash text,
  add column if not exists device_details jsonb not null default '{}'::jsonb,
  add column if not exists tested_components text[] not null default '{}';

create index if not exists idx_bookings_qr_passport_hash
  on bookings (qr_passport_hash)
  where qr_passport_hash is not null;


-- ─── 3. Seed Shop Pro Subscription Plan ──────────────────────────────────────

create table if not exists subscription_plans (
  code text primary key,
  name text not null,
  price_minor integer not null,
  currency text not null default 'INR',
  bookings_included integer,
  priority boolean not null default false,
  period_days integer not null default 30,
  blurb text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into subscription_plans (
  code,
  name,
  price_minor,
  currency,
  bookings_included,
  priority,
  period_days,
  blurb,
  is_active,
  sort_order
) values (
  'shop_pro',
  'Shop Pro SaaS',
  99900,
  'INR',
  null,
  true,
  30,
  'Priority radar placement, smart inventory ERP, automated WhatsApp/SMS alerts, and unlimited QR warranty passports.',
  true,
  10
)
on conflict (code) do update set
  name = excluded.name,
  price_minor = excluded.price_minor,
  currency = excluded.currency,
  period_days = excluded.period_days,
  blurb = excluded.blurb,
  is_active = excluded.is_active;
