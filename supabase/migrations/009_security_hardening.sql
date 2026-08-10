-- 009_security_hardening.sql
--
-- Six confirmed privilege problems, each verified by probe against the live
-- database before being written here — not inferred from reading policy text.
-- The probes are recorded next to each fix so they can be re-run afterwards
-- and are expected to flip.
--
-- Idempotent throughout: safe to re-run.

begin;

/* ───────────────────────────────────────────────────────────────────────────
   1. public.users was world-readable, including phone numbers

   Probe (anon key, no login):
     GET /rest/v1/users?select=id,full_name,phone,role
     → 200, 25 rows, real names and real phone numbers.

   Cause: policy `public profiles readable` is USING (true) with no role
   restriction, and `anon` holds SELECT. `Users can view own data` was the
   correct policy, but a permissive policy is a UNION — the widest one wins,
   so the narrow one had no effect.

   The name and avatar genuinely are public (review bylines, shop pages), and
   `messages.ts` reads a counterparty's name through the anon-key client, so
   this cannot become "own row only". But RLS is row-level and the problem is
   column-level: the row must stay readable while phone and full_name stop
   being. Column grants are the only mechanism that expresses that.

   Columns that stay public: id, display_name, avatar_url, created_at.
   Everything else moves behind two SECURITY DEFINER functions with an explicit
   subject: `my_profile()` (the caller's own row) and `booking_counterparties()`
   (customers who have actually booked with a shop the caller owns).

   Note grants are per-ROLE, not per-row: revoking `phone` from `authenticated`
   takes it away from the owner of the row too, which is exactly why the
   settings page moves to `my_profile()` rather than keeping a direct read.
   ─────────────────────────────────────────────────────────────────────────── */

revoke select on public.users from anon, authenticated;

grant select (id, display_name, avatar_url, created_at)
  on public.users to anon, authenticated;

-- The caller's own row, in full. Replaces the direct `select PROFILE_COLUMNS
-- ... eq('id', userId)` in `settings.ts` and `onboarding.ts`, both of which
-- only ever passed the signed-in user's own id.
create or replace function public.my_profile()
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  full_name text,
  phone text,
  phone_verified boolean,
  timezone text,
  preferred_contact text,
  marketing_opt_in boolean,
  onboarded_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path to 'public'
stable
as $$
  select u.id, u.display_name, u.avatar_url, u.full_name, u.phone,
         u.phone_verified, u.timezone, u.preferred_contact::text,
         u.marketing_opt_in, u.onboarded_at, u.created_at, u.updated_at
    from public.users u
   where u.id = (select auth.uid());
$$;

revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- A shop needs its customer's real name and phone to do the job, and
-- `expert.ts` reads exactly that through the anon-key client. Scoped to
-- "people who have actually booked with a shop I own" — the same predicate
-- `owns_shop()` uses, applied to the customer side.
create or replace function public.booking_counterparties(p_user_ids uuid[])
returns table (
  id uuid,
  display_name text,
  full_name text,
  avatar_url text,
  phone text
)
language sql
security definer
set search_path to 'public'
stable
as $$
  select u.id, u.display_name, u.full_name, u.avatar_url, u.phone
    from public.users u
   where u.id = any(p_user_ids)
     and exists (
       select 1
         from public.bookings b
         join public.fixer_profiles f on f.id = b.fixer_id
        where b.customer_id = u.id
          and f.owner_id = (select auth.uid())
     );
$$;

revoke execute on function public.booking_counterparties(uuid[]) from public, anon;
grant execute on function public.booking_counterparties(uuid[]) to authenticated;

-- `users.role` was self-writable: RLS allows a user to update their own row and
-- there was no column restriction, so anyone could set their own role to
-- 'admin'. Real admin capability comes from `seo_admins`, so this granted no
-- power — but it is the column the operator console displays as a user's role,
-- and a self-applied "admin" label sitting in a god-panel is a lie waiting to
-- be believed. Writes are limited to what the settings form actually submits.
revoke update on public.users from anon, authenticated;

grant update (
  display_name, avatar_url, full_name, phone, timezone,
  preferred_contact, marketing_opt_in, onboarded_at
) on public.users to authenticated;

/* ───────────────────────────────────────────────────────────────────────────
   2. A shop owner could lift their own suspension

   Probe (impersonating a real owner via request.jwt.claims):
     update fixer_profiles set suspended_at = null, is_hidden = false
      where id = <own shop>;
     → 1 row affected.

   Cause: `owner updates own profile` is USING (owner_id = auth.uid()) with no
   column restriction, and `authenticated` held UPDATE on every column. So the
   admin console's suspend button was advisory — the suspended owner could
   undo it from the browser console, and re-list themselves in the directory.

   `is_hidden` is the same story: it is what keeps an unapproved shop out of
   search, so a self-write is self-approval.

   Same shape for `verified` (the trust badge), `rating_avg`/`rating_count`
   (trigger-maintained, so a self-write is rating fraud), `owner_id` (shop
   takeover), `slug` (URL hijack), and the payout columns.
   ─────────────────────────────────────────────────────────────────────────── */

revoke update on public.fixer_profiles from anon, authenticated;

-- Everything an owner may legitimately edit from their own dashboard. Derived
-- from the writes in `expert-actions.ts`; anything absent here is either
-- admin-owned or trigger-owned.
grant update (
  shop_name, bio, address, lat, lng, specialties, photos,
  contact_phone, contact_email,
  hours, working_days, opening_time, closing_time, closed_on_holidays, timezone,
  offers_home_visit, offers_in_shop, offers_home_service, offers_pickup_drop,
  accepts_bookings, booking_lead_hours, booking_horizon_days,
  auto_accept, response_hours, default_warranty_days
) on public.fixer_profiles to authenticated;

-- anon has no business writing a shop at all.
revoke insert, delete on public.fixer_profiles from anon;

/* ───────────────────────────────────────────────────────────────────────────
   3. A shop owner could review their own shop

   Probe (impersonating a real owner):
     insert into reviews (fixer_id, customer_id, rating, text)
     values (<own shop>, <self>, 5, 'PROBE');
     → INSERT SUCCEEDED.

   Cause: two permissive INSERT policies. `customer writes own review` carries
   the NOT EXISTS self-review guard; the legacy `Customers can create reviews`
   is just `auth.uid() = customer_id`. Permissive policies are OR'd, so the
   legacy one grants what the careful one denies. `reviews_sync_rating` then
   folds the 5★ into the public average.

   `src/lib/reviews/actions.ts` already maps 42501 to "You can't review your
   own shop" — the message was correct, the database just never raised it.

   Same duplicate-policy pattern on `users` and `fixer_profiles`: the legacy
   policies there key off `fixer_profiles.user_id`, a column that is NULL on
   all 13 rows and read by no code, so they only ever widen access.
   ─────────────────────────────────────────────────────────────────────────── */

drop policy if exists "Customers can create reviews" on public.reviews;
drop policy if exists "Public reviews"                on public.reviews;

drop policy if exists "Users can view own data"   on public.users;
drop policy if exists "Users can update own data" on public.users;

drop policy if exists "Fixers can create own profile" on public.fixer_profiles;
drop policy if exists "Fixers can update own profile" on public.fixer_profiles;
drop policy if exists "Fixers can delete own profile" on public.fixer_profiles;

/* ───────────────────────────────────────────────────────────────────────────
   4. Anonymous callers could run the maintenance functions

   Probe (anon key, no login):
     POST /rest/v1/rpc/expire_stale_bookings     → HTTP 200
     POST /rest/v1/rpc/close_expired_warranties  → HTTP 200

   These are SECURITY DEFINER cron jobs that mass-update booking status. A
   stranger could close every warranty window that had just expired, or expire
   pending requests, on demand. Nothing in the app calls them — only pg_cron.

   The trigger functions in the same list are only reachable as triggers, but
   a public EXECUTE grant on a SECURITY DEFINER function is not something to
   leave lying around, so they go too. `search_fixers` and `shop_busy_periods`
   are called by the app with the anon key and deliberately keep their grants.
   ─────────────────────────────────────────────────────────────────────────── */

do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and p.proname in (
         'expire_stale_bookings', 'close_expired_warranties',
         'bookings_log_event', 'bookings_open_thread', 'bookings_set_reference',
         'bookings_stamp_transition', 'messages_touch_thread',
         'ensure_notification_prefs', 'sync_fixer_rating', 'shop_claims_apply',
         'handle_new_user', 'generate_booking_reference', 'touch_updated_at',
         'set_updated_at', 'stamp_published_at', 'check_idea_rate_limit',
         'rls_auto_enable'
       )
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', fn.sig);
  end loop;
end $$;

-- `owns_shop`, `is_booking_party`, `is_thread_party` and `is_dispute_party`
-- are called from inside RLS policies, which run as the querying role, so
-- they must keep EXECUTE. They are read-only predicates over the caller's own
-- auth.uid() and leak nothing.

-- Missing search_path on a SECURITY DEFINER function is a hijack vector: the
-- caller controls search_path, so an unqualified name can resolve to their own
-- table. Every other function here already sets it; these four did not.
alter function public.check_idea_rate_limit()   set search_path to 'public';
alter function public.bookings_set_reference()  set search_path to 'public';
alter function public.bookings_stamp_transition() set search_path to 'public';
alter function public.touch_updated_at()        set search_path to 'public';
alter function public.set_updated_at()          set search_path to 'public';
alter function public.stamp_published_at()      set search_path to 'public';
alter function public.search_fixers             set search_path to 'public';

/* ───────────────────────────────────────────────────────────────────────────
   5. `booking-attachments` was a public bucket

   The code treats it as private and is correct to: fault photos and warranty
   evidence are the two most sensitive things a customer uploads.
   `bookings/[reference]/page.tsx` and `warranty/[id]/page.tsx` both go through
   `createSignedUrls`, which is the private-bucket API — but the bucket row had
   `public = true`, so every object was also readable at its unsigned URL by
   anyone who could guess or be given the path.

   Zero objects exist today, so this is a fix before exposure rather than after.
   `avatars` has no policies and no objects either; the app writes avatars to
   `fixer_images`, so it is closed rather than configured.
   ─────────────────────────────────────────────────────────────────────────── */

update storage.buckets set public = false where id = 'booking-attachments';

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
 where id = 'booking-attachments';

-- Objects are keyed `<booking_id>/<filename>`, so the first path segment is
-- the authorisation subject. `is_booking_party` already encodes "customer or
-- shop owner on this booking" and is what the table policies use.
drop policy if exists "booking party reads attachments"   on storage.objects;
drop policy if exists "booking party uploads attachments" on storage.objects;
drop policy if exists "booking party removes attachments" on storage.objects;

create policy "booking party reads attachments"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'booking-attachments'
    and public.is_booking_party(((storage.foldername(name))[1])::uuid)
  );

create policy "booking party uploads attachments"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'booking-attachments'
    and public.is_booking_party(((storage.foldername(name))[1])::uuid)
  );

create policy "booking party removes attachments"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'booking-attachments'
    and public.is_booking_party(((storage.foldername(name))[1])::uuid)
  );

/* ───────────────────────────────────────────────────────────────────────────
   6. Tables with RLS on and no policy, and legacy tables nothing reads

   `cms_templates` and `seo_admins` have RLS enabled and zero policies, which
   denies everything to anon/authenticated and is the correct outcome — both
   are service-role only. But `cms_templates` still held table grants, which
   is a footgun the day someone adds a permissive policy. Revoked to match
   `seo_admins`, which already had none.

   `blog_templates` is writable by any authenticated user: its policies are
   `auth.role() = 'authenticated'`, which is every signed-up customer, not an
   admin. Only seo-admin touches this table and it uses the service-role
   client, so the write policies are removed rather than narrowed.

   The rest are pre-marketplace tables that no code in any of the three apps
   references. They keep permissive `USING (true)` policies and anon write
   grants. Left in place they are unmonitored write surface.
   ─────────────────────────────────────────────────────────────────────────── */

revoke all on public.cms_templates from anon, authenticated;

drop policy if exists "Admins can insert blog templates" on public.blog_templates;
drop policy if exists "Admins can update blog templates" on public.blog_templates;
drop policy if exists "Admins can delete blog templates" on public.blog_templates;
revoke insert, update, delete on public.blog_templates from anon, authenticated;

-- Legacy, unreferenced by src/, admin/src/ and seo-admin/src/. Reads stay
-- (harmless, and `impact_logs` may be public by intent); writes close.
revoke insert, update, delete on
  public.repair_ideas, public.idea_flags, public.inquiries,
  public.impact_logs, public.repair_photos, public.shop_inventory,
  public.saved_fixers
from anon, authenticated;

-- `blog_posts` and `seo_*` are edited exclusively from seo-admin through the
-- service-role client; the anon key never needs to write them.
revoke insert, update, delete on
  public.blog_posts, public.seo_pages, public.seo_global, public.seo_redirects
from anon, authenticated;

commit;
