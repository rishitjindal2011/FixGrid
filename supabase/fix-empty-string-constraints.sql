-- ════════════════════════════════════════════════════════════════════════════
-- Fix: empty strings in fixer_profiles block every update to the row
--
-- Symptom
--   Approving a shop claim in the admin panel fails with
--     23514: new row for relation "fixer_profiles" violates check constraint
--            "fixer_profiles_phone_shape"
--   and so does the Verify toggle, and so does saving the shop profile.
--
-- Cause
--   schema.sql adds this:
--
--     alter table fixer_profiles add constraint fixer_profiles_phone_shape
--       check (contact_phone ~ '^[0-9+][0-9 ()+-]{5,24}$') not valid;
--
--   `NOT VALID` skips the one-time scan of existing rows — but it still
--   enforces on every INSERT and UPDATE from that moment on. So a row that
--   already held `contact_phone = ''` was allowed to stay, and now *any* write
--   touching that row is rejected, whatever column the write was actually for.
--
--   NULL would be fine: `NULL ~ pattern` is NULL, and a CHECK passes on NULL.
--   The empty string is not — it evaluates the regex, fails it, and returns
--   false. `''` and NULL are different values and only one of them is legal.
--
--   That is also why approving a claim fails. `shop_claims_apply` is a BEFORE
--   UPDATE trigger that sets `fixer_profiles.owner_id`, so approving a claim
--   writes to the invalid row and inherits its problem.
--
-- Run the whole file in the Supabase SQL Editor. Step 1 is read-only.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. What is actually broken (read-only) ──────────────────────────────────
-- Run this first. Every row listed would reject an update today.

select
  id,
  shop_name,
  case
    when contact_phone is null then 'null (ok)'
    when contact_phone = ''    then 'EMPTY STRING — blocks updates'
    when contact_phone !~ '^[0-9+][0-9 ()+-]{5,24}$' then 'malformed: ' || contact_phone
    else 'ok'
  end as phone_state,
  case when btrim(coalesce(shop_name, '')) = '' then 'EMPTY' else 'ok' end as name_state,
  case
    when (lat is null) <> (lng is null) then 'HALF-SET — breaks fixer_geo_complete'
    else 'ok'
  end as geo_state,
  case
    when opening_time is not null and closing_time is not null
         and opening_time >= closing_time then 'OUT OF ORDER'
    else 'ok'
  end as hours_state
from fixer_profiles
where contact_phone = ''
   or (contact_phone is not null and contact_phone !~ '^[0-9+][0-9 ()+-]{5,24}$')
   or btrim(coalesce(shop_name, '')) = ''
   or ((lat is null) <> (lng is null))
   or (opening_time is not null and closing_time is not null and opening_time >= closing_time)
order by shop_name;


-- ── 2. Normalise empty strings to NULL ──────────────────────────────────────
-- "Not provided" is NULL. An empty string is a value that happens to be blank,
-- and every text constraint in this schema treats the two differently.

update fixer_profiles set contact_phone = null where btrim(contact_phone) = '';
update fixer_profiles set contact_email = null where btrim(contact_email) = '';
update fixer_profiles set bio           = null where btrim(bio)           = '';

-- Same class of problem on the profile table the dashboards write to.
update users set full_name = null where btrim(full_name) = '';
update users set phone     = null where btrim(phone)     = '';


-- ── 3. Anything still malformed has to be decided, not guessed ──────────────
-- A phone that is present but does not match the shape is real data entered
-- wrongly. This blanks it rather than inventing a correction: a wrong number on
-- a public listing is worse than no number, and the shop can re-enter it.
--
-- Comment this out if you would rather fix them by hand — step 1 lists them.

update fixer_profiles
   set contact_phone = null
 where contact_phone is not null
   and contact_phone !~ '^[0-9+][0-9 ()+-]{5,24}$';


-- ── 4. Make the constraints real ────────────────────────────────────────────
-- `VALIDATE CONSTRAINT` scans the existing rows and marks the constraint valid.
-- From then on the "bad data quietly accumulates, then poisons every later
-- update" failure cannot recur — the scan fails loudly here instead.
--
-- If one of these raises 23514, step 1 will show you which row. Fix it and
-- re-run; do not drop the constraint.

alter table fixer_profiles validate constraint fixer_profiles_phone_shape;
alter table fixer_profiles validate constraint fixer_profiles_name_len;
alter table fixer_profiles validate constraint fixer_profiles_bio_len;
alter table fixer_profiles validate constraint fixer_geo_complete;
alter table fixer_profiles validate constraint fixer_hours_ordered;


-- ── 5. Confirm ──────────────────────────────────────────────────────────────
-- Expect zero rows. Then the approve and verify buttons will work.

select id, shop_name, contact_phone
  from fixer_profiles
 where contact_phone = ''
    or (contact_phone is not null and contact_phone !~ '^[0-9+][0-9 ()+-]{5,24}$');
