-- ════════════════════════════════════════════════════════════════════════════
-- DESTRUCTIVE — deletes every account and all marketplace data
--
--   KEPT     repair_categories        (the taxonomy — you asked to keep it)
--            seo_pages, seo_global, seo_redirects, cms_templates
--
--   DELETED  every login in auth.users, and everything that hangs off one
--            fixer_profiles — ALL shops — and fixer_categories
--            every booking, message, payment, payout, refund, dispute, review
--            seo_admins — your :3001 and :3002 admin logins
--
-- There is no undo. Nothing here is recoverable without a database backup.
-- Take one first: Supabase dashboard → Database → Backups.
--
-- After running this you will be LOCKED OUT of both admin apps until you
-- create a new admin. See the bottom of this file.
--
-- Run section 1 on its own first — it only counts rows.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. What you are about to delete (read-only — run this first) ────────────

select 'auth.users (logins)' as table_name, count(*) as rows from auth.users
union all select 'public.users',        count(*) from public.users
union all select 'fixer_profiles',      count(*) from fixer_profiles
union all select 'reviews',             count(*) from reviews
union all select 'seo_admins',          count(*) from seo_admins
union all select '--- KEPT BELOW ---',  null
union all select 'repair_categories',   count(*) from repair_categories
union all select 'seo_pages',           count(*) from seo_pages
union all select 'cms_templates',       count(*) from cms_templates
order by 1;


-- ── 2. The wipe ─────────────────────────────────────────────────────────────
-- Everything runs in one transaction: if any statement fails the whole thing
-- rolls back, rather than leaving the database half-emptied with dangling
-- references. Read to the COMMIT before you run it.

begin;

-- 2a. Marketplace tables, newest-dependency-first.
--
-- Driven by `to_regclass` rather than a flat list of TRUNCATEs because the
-- marketplace migration may only be partly applied — a missing table should be
-- skipped, not abort the transaction. TRUNCATE ... CASCADE also reaches any
-- table that references one of these, which is what makes the order irrelevant.
do $$
declare
  t    text;
  live text[] := '{}';
begin
  foreach t in array array[
    'booking_attachments', 'booking_events', 'booking_notes', 'bookings',
    'client_notes', 'dispute_evidence', 'dispute_messages', 'disputes',
    'ledger_entries', 'message_attachments', 'message_threads', 'messages',
    'notification_prefs', 'notifications', 'payments', 'payouts', 'refunds',
    'saved_experts', 'shop_availability', 'shop_claims', 'shop_services',
    'shop_time_off', 'user_addresses',
    -- From schema.sql. `repair_categories` is deliberately absent: you asked to
    -- keep the taxonomy, and nothing it references is being removed.
    'fixer_categories', 'fixer_profiles', 'reviews'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      live := live || t;
    end if;
  end loop;

  if array_length(live, 1) is null then
    raise notice 'No marketplace tables present — nothing to truncate.';
  else
    execute 'truncate table public.' || array_to_string(live, ', public.')
         || ' restart identity cascade';
    raise notice 'Truncated % marketplace tables.', array_length(live, 1);
  end if;
end $$;

-- 2b. Uploaded files.
--
-- Storage rows are user data too, and deleting the accounts leaves them
-- orphaned but still billable. Guarded because the buckets are only created
-- once storage is actually used.
do $$
begin
  if to_regclass('storage.objects') is not null then
    delete from storage.objects
     where bucket_id in ('avatars', 'booking-attachments');
    raise notice 'Cleared storage objects.';
  end if;
end $$;

-- 2c. The accounts themselves.
--
-- One statement, because the foreign keys do the rest: `public.users`,
-- `reviews`, `shop_claims`, `user_addresses`, `bookings`, `saved_experts`,
-- `notifications` and `notification_prefs` all reference `auth.users` with
-- ON DELETE CASCADE. (`fixer_profiles.owner_id` is ON DELETE SET NULL, which is
-- moot here — those rows are already gone.)
delete from auth.users;

-- 2d. Admin logins, as requested.
delete from seo_admins;

commit;


-- ── 3. Confirm ──────────────────────────────────────────────────────────────
-- Every count in the first group must be 0. The second group must NOT be.

select 'auth.users' as table_name, count(*) as should_be_zero from auth.users
union all select 'public.users',   count(*) from public.users
union all select 'fixer_profiles', count(*) from fixer_profiles
union all select 'reviews',        count(*) from reviews
union all select 'seo_admins',     count(*) from seo_admins
order by 1;

select 'repair_categories' as kept, count(*) as should_be_nonzero from repair_categories
union all select 'seo_pages',     count(*) from seo_pages
union all select 'cms_templates', count(*) from cms_templates
order by 1;


-- ════════════════════════════════════════════════════════════════════════════
-- Getting back in
--
-- 1. Admin login — you are locked out of :3001 and :3002 until this exists.
--    Generate a hash (from the repo root):
--
--        npm run admin:hash -- you@example.com owner
--
--    then insert the row it prints. Do NOT write a plaintext password here;
--    `seo_admins.password_hash` is a bcrypt hash and the login verifies it.
--
-- 2. Shops — the directory is now empty, so search, the homepage and
--    /dashboard/discover will all render their empty states. Restore the
--    seeded shops with:
--
--        supabase/seed.sql
--
--    It inserts fixer_profiles and fixer_categories against the
--    repair_categories rows this script kept, so it will slot straight back in.
--
-- 3. Customers — sign up again through the site. `handle_new_user` creates the
--    matching `public.users` row automatically.
-- ════════════════════════════════════════════════════════════════════════════
