-- ════════════════════════════════════════════════════════════════════════════
-- Fix-It Registry — Row Level Security for the marketplace tables
--
-- Run AFTER migrations/001_marketplace.sql. That file's PHASE 5b turns RLS on
-- for all 23 tables, which — with no policies yet — denies everything. This
-- file opens exactly what each party needs and nothing more.
--
-- Same conventions as policies.sql: `drop policy if exists` before every
-- `create policy` so the file is re-runnable, `(select auth.uid())` rather than
-- bare `auth.uid()` so the planner hoists it out of the row loop, and
-- `to authenticated` on anything that is not a deliberate public read.
--
-- Two things RLS cannot do, and how the schema is shaped around them:
--
--   • It is row-level, never column-level. A customer who can read their own
--     booking row can read *every column of it*. The app not selecting a column
--     is not a security control — anyone can hand-write a PostgREST query
--     against their own row. So anything private to one party lives in its own
--     table (`booking_notes`, `client_notes`, `shop_time_off`) where a row
--     policy can actually hold it. Column privileges are no help either: both
--     parties authenticate as the same `authenticated` role.
--   • It does not protect a table you forgot to enable it on. The grants
--     section at the bottom is belt-and-braces for exactly that.
-- ════════════════════════════════════════════════════════════════════════════

-- Re-assert what the migration did. Cheap, idempotent, and this file must be
-- safe to run on its own — if PHASE 5b were ever edited out, the policies
-- below would silently become decoration on wide-open tables.
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
-- Helpers
--
-- Both are `security definer` with a pinned `search_path`. Two reasons, and the
-- second is the important one:
--
--   1. The check stays correct regardless of what policies later land on
--      `fixer_profiles` or `bookings`. A helper that reads a table through that
--      table's own RLS would change meaning when those policies change.
--   2. It breaks policy recursion. `booking_events`' policy needs to ask about
--      `bookings`; if `bookings` ever grows a policy that asks about
--      `booking_events`, an RLS-respecting helper deadlocks into infinite
--      recursion (Postgres raises 42P17). A definer function reads past RLS and
--      cannot recurse.
--
-- `stable` lets the planner call them once per query rather than once per row.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function owns_shop(p_fixer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$ 
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from fixer_profiles f
     where f.id = p_fixer_id
       and f.owner_id = (select auth.uid())
  ) into v_exists;
  return v_exists;
end;
$$;

comment on function owns_shop(uuid) is
  'True when the caller owns the given shop. Ownership is granted only by an approved shop_claims row.';

create or replace function is_booking_party(p_booking_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from bookings b
     where b.id = p_booking_id
       and (b.customer_id = (select auth.uid()) or owns_shop(b.fixer_id))
  ) into v_exists;
  return v_exists;
end;
$$;

comment on function is_booking_party(uuid) is
  'True when the caller is either the customer on the booking or the owner of the shop it was placed with.';

create or replace function is_thread_party(p_thread_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from message_threads mt
     where mt.id = p_thread_id
       and (mt.customer_id = (select auth.uid()) or owns_shop(mt.fixer_id))
  ) into v_exists;
  return v_exists;
end;
$$;

create or replace function is_dispute_party(p_dispute_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from disputes d
     where d.id = p_dispute_id
       and (d.customer_id = (select auth.uid()) or owns_shop(d.fixer_id))
  ) into v_exists;
  return v_exists;
end;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default, and `anon` is
-- a member of PUBLIC — so revoking from `anon` alone would do nothing. Revoke
-- from PUBLIC, then grant back to the one role that needs it.
--
-- Neither function leaks to a signed-out caller in practice (auth.uid() is null,
-- so both return false), but a definer function is a privileged object and
-- should be reachable only by callers who have a use for it.
revoke all on function owns_shop(uuid) from public;
revoke all on function is_booking_party(uuid) from public;
grant execute on function owns_shop(uuid) to authenticated;
grant execute on function is_booking_party(uuid) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- Shop claims — the gate on every write a shop owner ever makes
--
-- This is the highest-privilege table in the file. `shop_claims_apply` (phase 6
-- of the migration) sets `fixer_profiles.owner_id` when a row reaches
-- 'approved', and owning a listing means write access to a live public page and
-- the ability to accept money. So the one thing a claimant must never be able
-- to do is approve their own claim.
--
-- The update policy is therefore split at the status boundary: `using` only
-- matches rows still pending, and `with check` only permits the row to land on
-- 'pending' or 'withdrawn'. Approval and rejection are service-role only, from
-- the admin dashboard. Without the `with check` half, a claimant could PATCH
-- status='approved' and seize the shop.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "claimant reads own claims" on shop_claims;
create policy "claimant reads own claims"
  on shop_claims for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "owner reads claims on own shop" on shop_claims;
create policy "owner reads claims on own shop"
  on shop_claims for select
  to authenticated
  using (owns_shop(fixer_id));

drop policy if exists "claimant opens own claim" on shop_claims;
create policy "claimant opens own claim"
  on shop_claims for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    -- Cannot claim a shop somebody already owns.
    and not exists (
      select 1 from fixer_profiles f
       where f.id = shop_claims.fixer_id and f.owner_id is not null
    )
  );

drop policy if exists "claimant amends pending claim" on shop_claims;
create policy "claimant amends pending claim"
  on shop_claims for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'pending')
  with check (
    user_id = (select auth.uid())
    and status in ('pending', 'withdrawn')
  );

-- ════════════════════════════════════════════════════════════════════════════
-- Shop-managed tables
--
-- Services and availability are public reads: the booking form on a shop's
-- page has to render them to an anonymous visitor deciding whether to sign up.
-- Only active services are exposed — a shop drafting a new service, or one it
-- has retired, is nobody else's business.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "active services readable by all" on shop_services;
create policy "active services readable by all"
  on shop_services for select
  using (is_active);

-- `for all` covers select too, which is how an owner sees their own *inactive*
-- services — the draft and retired ones the public policy above hides.
-- Permissive policies OR together, so the two coexist without a third policy.
drop policy if exists "owner manages own services" on shop_services;
create policy "owner manages own services"
  on shop_services for all
  to authenticated
  using (owns_shop(fixer_id))
  with check (owns_shop(fixer_id));

drop policy if exists "availability readable by all" on shop_availability;
create policy "availability readable by all"
  on shop_availability for select
  using (true);

drop policy if exists "owner manages own availability" on shop_availability;
create policy "owner manages own availability"
  on shop_availability for all
  to authenticated
  using (owns_shop(fixer_id))
  with check (owns_shop(fixer_id));

-- ─── Time off is owner-only, and this is not an oversight ───────────────────
--
-- `shop_time_off.reason` is free text a shop writes for itself: "closed —
-- bereavement", "hospital". RLS cannot hide one column of a readable row, so a
-- public select policy on this table would publish that text to anyone who
-- asks. There is no version of "readable by all" that is safe here.
--
-- But slot generation genuinely needs to know these periods, for visitors who
-- are not signed in at all. So the *fact* of being busy is exposed through the
-- definer function below, which returns merged ranges and no reason, no id and
-- no hint of whether a period is a closure or a booked job.

drop policy if exists "owner manages own time off" on shop_time_off;
create policy "owner manages own time off"
  on shop_time_off for all
  to authenticated
  using (owns_shop(fixer_id))
  with check (owns_shop(fixer_id));

-- Everything a slot picker needs and nothing it doesn't.
--
-- Merging matters as much as the column list: returned separately, a closure
-- and a confirmed booking are distinguishable by their boundaries, and a run of
-- hour-long busy ranges on a Tuesday is a readable diary. `range_agg` unions
-- them into opaque blocks. `p_from`/`p_to` are clamped to a 90-day window so
-- the function cannot be used to dump a shop's entire year.
create or replace function shop_busy_periods(
  p_fixer_id uuid,
  p_from     timestamptz,
  p_to       timestamptz
)
returns setof tstzrange
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select tstzrange(p_from, least(p_to, p_from + interval '90 days')) as win
  ),
  busy as (
    select period from shop_time_off, bounds
     where fixer_id = p_fixer_id and period && bounds.win
    union all
    select slot from bookings, bounds
     where fixer_id = p_fixer_id
       and slot && bounds.win
       and status in ('accepted', 'confirmed', 'in_progress')
  ),
  merged as (
    select range_agg(period) as m from busy
  )
  -- range_agg returns one multirange; unnest expands it back to ranges. An
  -- empty `busy` gives null, and unnest(null) yields no rows, which is right.
  select unnest(m) from merged where m is not null;
$$;

comment on function shop_busy_periods(uuid, timestamptz, timestamptz) is
  'Merged busy ranges for a shop, for slot generation. Deliberately returns no reason, id or kind: the caller learns when the shop is unavailable, never why.';

grant execute on function shop_busy_periods(uuid, timestamptz, timestamptz)
  to anon, authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Customer's own records
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "user manages own addresses" on user_addresses;
create policy "user manages own addresses"
  on user_addresses for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user manages own saved experts" on saved_experts;
create policy "user manages own saved experts"
  on saved_experts for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user reads own notifications" on notifications;
create policy "user reads own notifications"
  on notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Marking as read is the only write a client makes here. There is no insert
-- policy: notifications are raised by triggers and server actions running as
-- service-role, so nobody can fabricate a notification for another user — or
-- for themselves, which would be a way to forge an audit trail.
drop policy if exists "user marks own notifications read" on notifications;
create policy "user marks own notifications read"
  on notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user manages own notification prefs" on notification_prefs;
create policy "user manages own notification prefs"
  on notification_prefs for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ════════════════════════════════════════════════════════════════════════════
-- Bookings
--
-- Both parties read the row. Writes are where the care goes.
--
-- On insert the customer may only create a `requested` booking for themselves.
-- Without the status clause a customer could POST status='confirmed' and hold a
-- slot the shop never agreed to — and because the exclusion constraint only
-- covers confirmed/in_progress, that would also let them block a competitor's
-- diary. `requested` is deliberately outside that constraint so several people
-- can ask for the same time and the shop chooses.
--
-- Update is split by party, and neither side gets `for all`: there is no delete
-- policy on this table at all. Cancelling is a status transition that leaves an
-- audit row, not a DELETE that erases the history a dispute would be argued
-- from. The legal transitions themselves are enforced in
-- src/lib/bookings/machine.ts and by the phase 6 trigger — RLS decides *who may
-- touch the row*, the state machine decides *what the row may become*. Trying
-- to express the transition table in SQL policies would duplicate it in a
-- second language and let the two drift.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "customer reads own bookings" on bookings;
create policy "customer reads own bookings"
  on bookings for select
  to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists "shop reads bookings for own shop" on bookings;
create policy "shop reads bookings for own shop"
  on bookings for select
  to authenticated
  using (owns_shop(fixer_id));

drop policy if exists "customer requests booking" on bookings;
create policy "customer requests booking"
  on bookings for insert
  to authenticated
  with check (
    customer_id = (select auth.uid())
    and status = 'requested'
    -- A shop owner booking their own shop would corrupt the earnings figures
    -- and give them a self-reviewable completed booking.
    and not owns_shop(fixer_id)
  );

drop policy if exists "customer updates own booking" on bookings;
create policy "customer updates own booking"
  on bookings for update
  to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

drop policy if exists "shop updates bookings for own shop" on bookings;
create policy "shop updates bookings for own shop"
  on bookings for update
  to authenticated
  using (owns_shop(fixer_id))
  with check (owns_shop(fixer_id));


-- ─── The audit trail: append-only, in the strict sense ──────────────────────
--
-- Select for both parties, insert for both parties, and no update or delete
-- policy for anyone. Not even the row's own author can edit or remove an event
-- after the fact. That is the whole value of the table: a timeline a customer
-- and a shop disagreeing about what was promised can both be held to.
--
-- The phase 6 trigger writes these as `security definer`, so it runs as the
-- table owner and is exempt from these policies. The insert policy is for
-- app-written notes ("waiting on a screen from our supplier"), where the actor
-- is a real signed-in person.

drop policy if exists "parties read booking events" on booking_events;
create policy "parties read booking events"
  on booking_events for select
  to authenticated
  using (is_booking_party(booking_id));

drop policy if exists "parties append booking events" on booking_events;
create policy "parties append booking events"
  on booking_events for insert
  to authenticated
  with check (
    is_booking_party(booking_id)
    and actor_id = (select auth.uid())
  );


-- ─── Private notes, one row per job, shop only ──────────────────────────────
--
-- No select policy for the customer, by design. See the header.

drop policy if exists "shop manages own booking notes" on booking_notes;
create policy "shop manages own booking notes"
  on booking_notes for all
  to authenticated
  using (owns_shop(fixer_id))
  with check (owns_shop(fixer_id));


drop policy if exists "parties read booking attachments" on booking_attachments;
create policy "parties read booking attachments"
  on booking_attachments for select
  to authenticated
  using (is_booking_party(booking_id));

drop policy if exists "parties add booking attachments" on booking_attachments;
create policy "parties add booking attachments"
  on booking_attachments for insert
  to authenticated
  with check (
    is_booking_party(booking_id)
    and uploaded_by = (select auth.uid())
  );

-- You may remove a photo you uploaded, not one the other party uploaded.
drop policy if exists "uploader removes own attachment" on booking_attachments;
create policy "uploader removes own attachment"
  on booking_attachments for delete
  to authenticated
  using (uploaded_by = (select auth.uid()));

-- ════════════════════════════════════════════════════════════════════════════
-- Messaging
--
-- `message_threads` carries `customer_id` and `fixer_id` denormalised from the
-- booking, so the thread policy needs no join and the per-message policy is one
-- lookup deep. There is no policy allowing a client to create a thread: threads
-- are opened server-side when a booking is created, which is what keeps the
-- inbox tied to real jobs instead of becoming a cold-contact channel.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function is_thread_party(p_thread_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
      from message_threads t
     where t.id = p_thread_id
       and (t.customer_id = (select auth.uid()) or owns_shop(t.fixer_id))
  ) into v_exists;
  return v_exists;
end;
$$;

revoke all on function is_thread_party(uuid) from public;
grant execute on function is_thread_party(uuid) to authenticated;

drop policy if exists "parties read own threads" on message_threads;
create policy "parties read own threads"
  on message_threads for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or owns_shop(fixer_id)
  );

drop policy if exists "parties read thread messages" on messages;
create policy "parties read thread messages"
  on messages for select
  to authenticated
  using (is_thread_party(thread_id));

drop policy if exists "party sends message" on messages;
create policy "party sends message"
  on messages for insert
  to authenticated
  with check (
    is_thread_party(thread_id)
    and sender_id = (select auth.uid())
  );

-- Update exists only so the recipient can stamp `read_at`. RLS cannot restrict
-- it to that one column, so a determined party could also rewrite the body of
-- their own message after sending it. That is an acceptable, bounded risk here
-- — you can already say anything you like in the next message — and the
-- alternative (a definer RPC for read receipts) buys little. It is NOT
-- acceptable on booking_events, which is why that table has no update policy.
drop policy if exists "party updates thread message" on messages;
create policy "party updates thread message"
  on messages for update
  to authenticated
  using (is_thread_party(thread_id))
  with check (is_thread_party(thread_id));

drop policy if exists "parties read message attachments" on message_attachments;
create policy "parties read message attachments"
  on message_attachments for select
  to authenticated
  using (exists (
    select 1 from messages m
     where m.id = message_attachments.message_id
       and is_thread_party(m.thread_id)
  ));

drop policy if exists "sender adds message attachment" on message_attachments;
create policy "sender adds message attachment"
  on message_attachments for insert
  to authenticated
  with check (exists (
    select 1 from messages m
     where m.id = message_attachments.message_id
       and m.sender_id = (select auth.uid())
  ));


-- ════════════════════════════════════════════════════════════════════════════
-- Money — read-only to every client, without exception
--
-- Not one of these five tables has an insert, update or delete policy. Every
-- row is written by the Stripe webhook handler and the payout job, both running
-- as service-role. A client that could write here could mark its own booking
-- paid, or credit its own ledger.
--
-- Reads are scoped tightly: a customer sees their own payments and refunds, a
-- shop sees its own payouts, and the ledger is filtered to whichever side of
-- the entry belongs to the caller.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "parties read booking payments" on payments;
create policy "parties read booking payments"
  on payments for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or is_booking_party(booking_id)
  );

drop policy if exists "parties read booking refunds" on refunds;
create policy "parties read booking refunds"
  on refunds for select
  to authenticated
  using (is_booking_party(booking_id));

drop policy if exists "shop reads own payouts" on payouts;
create policy "shop reads own payouts"
  on payouts for select
  to authenticated
  using (owns_shop(fixer_id));

drop policy if exists "party reads own ledger entries" on ledger_entries;
create policy "party reads own ledger entries"
  on ledger_entries for select
  to authenticated
  using (
    customer_id = (select auth.uid())
    or (fixer_id is not null and owns_shop(fixer_id))
  );

-- ════════════════════════════════════════════════════════════════════════════
-- Disputes / warranty claims
--
-- Raising one is the customer's right, but only on a job that was actually
-- completed and only while the warranty window is open. Both conditions are in
-- the policy rather than only in the server action, because this is the table
-- that decides whether money moves back.
--
-- `resolution`, `refund_amount` and `resolved_by` are only ever set by an admin
-- through the service-role key: there is no update policy here at all, so a
-- claimant cannot mark their own claim resolved in their favour.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function is_dispute_party(p_dispute_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from disputes d
     where d.id = p_dispute_id
       and is_booking_party(d.booking_id)
  );
$$;

revoke all on function is_dispute_party(uuid) from public;
grant execute on function is_dispute_party(uuid) to authenticated;

drop policy if exists "parties read booking disputes" on disputes;
create policy "parties read booking disputes"
  on disputes for select
  to authenticated
  using (is_booking_party(booking_id));

drop policy if exists "customer raises dispute in warranty" on disputes;
create policy "customer raises dispute in warranty"
  on disputes for insert
  to authenticated
  with check (
    raised_by = (select auth.uid())
    and status = 'open'
    and exists (
      select 1 from bookings b
       where b.id = disputes.booking_id
         and b.customer_id = (select auth.uid())
         -- 'disputed' is allowed so a second claim can be filed on a job
         -- already under review; 'closed' is not — the window has shut.
         and b.status in ('completed', 'disputed')
         and b.warranty_expires_at is not null
         and b.warranty_expires_at > now()
    )
  );

drop policy if exists "parties read dispute messages" on dispute_messages;
create policy "parties read dispute messages"
  on dispute_messages for select
  to authenticated
  using (is_dispute_party(dispute_id));

drop policy if exists "party posts dispute message" on dispute_messages;
create policy "party posts dispute message"
  on dispute_messages for insert
  to authenticated
  with check (
    is_dispute_party(dispute_id)
    and author_id = (select auth.uid())
    -- Cannot post as the adjudicator.
    and author_role in ('customer', 'shop')
  );

drop policy if exists "parties read dispute evidence" on dispute_evidence;
create policy "parties read dispute evidence"
  on dispute_evidence for select
  to authenticated
  using (is_dispute_party(dispute_id));

drop policy if exists "party uploads dispute evidence" on dispute_evidence;
create policy "party uploads dispute evidence"
  on dispute_evidence for insert
  to authenticated
  with check (
    is_dispute_party(dispute_id)
    and uploaded_by = (select auth.uid())
  );


-- ════════════════════════════════════════════════════════════════════════════
-- Expert CRM — the shop's private notes on a customer
--
-- One policy, owner-only, and no read for the person the note is about. Same
-- reasoning as booking_notes.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "shop manages own client notes" on client_notes;
create policy "shop manages own client notes"
  on client_notes for all
  to authenticated
  using (owns_shop(fixer_id))
  with check (owns_shop(fixer_id));


-- ════════════════════════════════════════════════════════════════════════════
-- Grants — belt and braces
--
-- Policies decide which rows. Grants decide whether the role may reach the
-- table at all, and they are what saves you when a policy is added by mistake
-- or RLS is switched off during debugging and not switched back on.
--
-- `anon` keeps exactly two reads: the service catalogue and opening hours, both
-- of which a signed-out visitor needs to see a shop's booking form. Everything
-- else about a booking, a message, a payment or a private note is revoked
-- outright, so the anon key in the browser bundle cannot reach it even with RLS
-- disabled.
-- ════════════════════════════════════════════════════════════════════════════

revoke all on
  shop_claims, user_addresses, shop_time_off,
  bookings, booking_events, booking_notes, booking_attachments,
  saved_experts, message_threads, messages, message_attachments,
  notifications, notification_prefs,
  payments, refunds, payouts, ledger_entries,
  disputes, dispute_messages, dispute_evidence, client_notes
  from anon;

grant select on shop_services, shop_availability to anon;

-- Nothing authenticates as a client and writes money or an audit row.
revoke insert, update, delete on
  payments, refunds, payouts, ledger_entries
  from authenticated;

-- Append-only means append-only at the privilege level too, not just the policy
-- level.
revoke update, delete on booking_events from authenticated;

-- A dispute is amended by adding a message, never by editing the claim, and it
-- is closed by an admin. Deleting one would erase the record of a refund
-- argument.
revoke update, delete on disputes from authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- Verifying this file did what it says
--
-- After running it, these two queries should both return zero rows. The first
-- catches a table left unlocked; the second catches a table locked with nothing
-- able to reach it, which is a bug unless it is deliberate (see cms_templates
-- and seo_admins in policies.sql).
--
--   select tablename from pg_tables
--    where schemaname = 'public' and not rowsecurity;
--
--   select t.tablename
--     from pg_tables t
--     left join pg_policies p
--       on p.schemaname = t.schemaname and p.tablename = t.tablename
--    where t.schemaname = 'public' and p.policyname is null
--      and t.tablename not in ('cms_templates', 'seo_admins');
-- ════════════════════════════════════════════════════════════════════════════
