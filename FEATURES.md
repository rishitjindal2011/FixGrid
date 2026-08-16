# FixGrid — feature roadmap

Written 16 August 2026, after a day working through the money layer.

Grounded in two things: what the codebase actually does today (checked, not
assumed), and a live read of Urban Company's public pricing and category
structure. Web search was unavailable in the session that produced this, so the
competitor grounding is one source rather than a survey — treat the market claims
below as directional and the codebase claims as verified.

Ordered by **what blocks revenue**, then by leverage. Each item names the files it
touches so it can be picked up without re-deriving the context.

---

## 0. Not features — these block launch

These are unglamorous and they gate everything else. Nothing in section 1+ matters
if these are open.

### 0.1 Live credentials are committed to the repo

`probe-cookie.txt` and `probe-expert-cookie.txt` hold full Supabase auth cookies —
access **and refresh** tokens — for project `iusbwebxzrjwwfquscfp`.
`probe-fixtures.json` holds a test account's email and password in plaintext. 16
`probe-*` files are tracked.

Refresh tokens do not expire on their own. Anyone with repo history has a session.

**Do:** revoke sessions (Supabase → Auth → sign out all users, or rotate the JWT
secret), purge the files from history, add `probe-*` to `.gitignore`.

### 0.2 `.gitignore` is corrupt

The last hygiene commit appended `FixGrid-main/` as **UTF-16LE**, so the file now
contains NUL bytes, git treats it as binary, and the pattern matches nothing.
Rewrite it as UTF-8.

### 0.3 Payments are simulated end to end

`simulateGateway` in `src/lib/wallet/topup.ts` is the only thing standing where a
provider goes. Everything around it is real and tested — intent rows, the
claim-then-credit at-most-once guarantee, idempotency keys, the ledger. That was
deliberate: **swapping in Razorpay or Stripe replaces one function**, and the
intent row, the claim and the ledger posting all stay.

Razorpay over Stripe for an INR-first product: UPI is a first-class rail, and UPI
is how this market actually pays.

**Do:** replace `simulateGateway` with a real order + webhook. The webhook handler
should call the *existing* `settleAttempt` path rather than a new one.

### 0.4 No cron is running

`expire_stale_bookings` and `close_expired_warranties` exist as SECURITY DEFINER
functions and nothing invokes them. Consequences today: a request nobody answers
stays `requested` for ever and its fee is never refunded (the refund only fires on
a transition), and warranty windows never close.

**Do:** pg_cron, or hit `/api/cron/reminders` on a schedule with `CRON_SECRET`.
Both functions had their public EXECUTE revoked by migration 009, so the caller
must be service-role.

### 0.5 Self-serve top-up has no daily cap

`wallet_topups` bounds a single attempt to ₹10,000 and nothing bounds the day. A
user can mint money in a loop. Fine while it is you testing; not fine with real
users.

**Do:** a daily sum check in `createTopUpIntent`, plus a per-user velocity guard.

---

## 1. Trust — the thing a repair marketplace actually sells

Nobody hands over a laptop because the UI is nice. This is the highest-leverage
section and the most under-built.

### 1.1 Verified-identity badge with real backing

`fixer_profiles.verified` exists and is admin-set, and `shop_claims` collects
evidence photos. But "verified" currently means "an admin looked at a photo".

**Add:** a documented verification standard — GST number, Udyam registration,
shop-front photo, ID match — stored per claim with which checks passed. Show
customers *what* was verified, not just a tick. A badge nobody can interrogate is
decoration.

### 1.2 Warranty is the differentiator — lead with it — **DONE**

`warranty_days`, `warranty_expires_at`, the dispute flow and the escrow view are
all built and working. **Urban Company's public pages show no warranty or
money-back language at all.** That is an opening, and it is already in the
schema.

**Add:** a warranty badge on every search result and shop card; "covered until
{date}" on the booking; a warranty filter in search. Move it from a detail page to
the pitch.

**Shipped:**

- `WarrantyBadge` on search results, the homepage featured list and the shop
  profile's contact card, above the call button. One component, so the wording
  cannot drift between surfaces. Renders nothing at 0 days.
- A warranty floor in the public search rail and the dashboard discover rail,
  backed by `min_warranty_days` on `search_fixers` (migration 011). Steps are
  Any / Offered / 30d+ / 90d+; the floor is a real SQL predicate, not a
  post-filter, so the "showing the first N" count stays honest.
- The facet is excluded from `isIndexable`, so it cannot bloat the index.

**Still open here:** "covered until {date}" on the booking itself.

### 1.3 Escrow that is real

`billing.ts` computes `inEscrowPence` from the warranty window, which is the
honest read — but the money is not actually held. It is debited from the customer
and credited to the platform wallet.

**Add:** a `held` state on the shop's wallet so the shop can see money accruing
but not yet withdrawable, and release it when the warranty closes. The ledger
already supports it; this is a new `wallet_kind` or a second balance column, not a
new system.

### 1.4 Review integrity

Migration 009 fixed a real hole here (a shop could review itself through a
duplicate permissive policy). Reviews are still unmoderated and unverified.

**Add:** reviews only from `completed` bookings (the `booking_id` column exists and
is nullable — tighten it), a "verified purchase" marker, and admin takedown with a
reason. Shop right-of-reply is cheap and disproportionately calming.

---

## 2. Booking and operations

### 2.1 Arrival window, not a slot

Every Urban Company tile leads with an ETA — "44 mins", "29 mins". Yours leads
with a calendar slot. For a home visit the ETA is the thing people care about.

**Add:** `arrival_window_minutes` on the booking and a live "on the way" state.
This is a new status in `machine.ts` (`en_route`, between `confirmed` and
`in_progress`) plus a transition — the state machine is built for exactly this
kind of addition.

### 2.2 Diagnostic-fee entry point

Urban Company sells a ₹49 plumber consultation, ₹199 microwave check-up, ₹299 AC
repair. A cheap diagnostic converts far better than "request a quote", which is
what a `price_type = 'quote'` service currently forces.

**Add:** a `diagnostic_fee_minor` on `shop_services`, charged up front and credited
against the final bill if the job proceeds. The ledger handles the credit.

### 2.3 Reschedule that actually reschedules

`requestReschedule` deliberately does **not** move the slot — it writes an audit
event and a message, because letting one side rewrite an agreed time unilaterally
would be wrong. But there is no accept step, so a proposal goes nowhere.

**Add:** accept/decline on the proposal, which moves `slot` and re-runs the
exclusion-constraint check. Small, and it finishes a feature that is 80% built.

### 2.4 Recurring jobs

AC servicing, water-purifier filters, pest control — all naturally recurring, and
recurring revenue is worth more than the booking. Nothing supports it.

**Add:** a `booking_series` row with a cadence, generating the next booking on
completion.

### 2.5 Parts and stock on the job

`shop_inventory` exists with quantity and SKU, and the public panel renders it.
The booking has no link to it, so a job that consumed a part does not decrement
stock or itemise the bill.

**Add:** `booking_parts` joining a booking to inventory rows, feeding both the bill
and the stock count.

---

## 3. Money

### 3.1 Shop payouts that leave the building

`requestPayout` writes a `payouts` row and the code openly admits the insert is
refused for `authenticated` — the button is decorative against a correctly locked
database. `markPayoutPaid` in the admin is owner-gated and real, but nothing moves
money outward.

**Add:** Razorpay X or a bank-transfer file. Until then, make the shop-side button
honest about being a request, which it currently half is.

### 3.2 GST and compliant invoices

Money is INR, the platform takes a fee and pays a rebate, and there is no tax
handling. `tax_amount` exists on `bookings` and `payments` and is never written.

**Add:** GSTIN on `fixer_profiles`, tax breakdown on the invoice, and a
downloadable invoice PDF. This is a legal requirement, not a feature.

### 3.3 Refund policy in code, not in prose

The fee refund on `declined`/`expired`/`cancelled_shop` is implemented and
deliberately excludes `cancelled_customer`. Cancellation of a *confirmed* booking
has no policy at all — no window, no charge, nothing.

**Add:** a cancellation window (free before N hours, partial after) as data on the
shop, so different trades can set different terms.

---

## 4. Discovery

### 4.1 The map is built; the geography is not

`search_fixers` takes a viewport and the Leaflet map works. There is no radius
search, no "near me", no travel-time estimate, and no service-area concept — a
shop cannot say it covers 5 km.

**Add:** `service_radius_km` on the profile, PostGIS distance sort, and a
"within 30 minutes" filter. `lat`/`lng` are already on both shops and addresses.

### 4.2 Structured pricing customers can compare

`price_type` supports `fixed | from | quote`, and the seeded SEO pages already
publish cost ranges. What is missing is the aggregate: "phone screen replacement
in Delhi costs ₹1,800–₹3,200".

**Add:** a per-category price index computed from completed bookings. It makes the
programmatic SEO pages genuinely useful rather than templated, which is the
difference between ranking and not.

### 4.3 Availability in search results

`shop_busy_periods` and `generateSlots` can already answer "what is free
tomorrow", but search results do not show it. "Next available: today 3pm" on a
card is one of the strongest conversion levers in this category.

---

## 5. Shop-side

### 5.1 A mobile experience for the person holding a screwdriver

The expert dashboard is a desktop layout. The user is standing at a bench with one
hand free. Everything else here is secondary to this.

**Add:** a mobile-first job view — today's list, one-tap status transitions, camera
straight to completion photos. The transitions and uploads all exist.

### 5.2 Quote templates

`sendQuote` takes a free-typed figure every time. Shops quote the same jobs
repeatedly.

**Add:** saved quote lines per service, and a quote built from parts + labour that
the customer can see itemised.

### 5.3 Earnings that explain themselves

The chart now shows gross and rebate. Shops will ask where a number came from.

**Add:** a statement view per period reconciling bookings, rebates and payouts —
essentially what `/dashboard/wallet` does for customers, for the shop.

---

## 6. Platform

### 6.1 Notifications people actually receive

`src/lib/notifications/` and `src/lib/email/` are wired with Resend, and
`notification_prefs` has SMS columns with no SMS behind them. Email deliverability
on a new domain is its own project (SPF, DKIM, DMARC, warming).

**Add:** SMS via MSG91 or Twilio for booking confirmations — in this market SMS and
WhatsApp beat email decisively. WhatsApp Business API is the real answer and is a
bigger piece of work.

### 6.2 Nothing is tested

There is no test file in the repo. The three most valuable targets are pure and
already isolated for exactly this reason: `machine.ts` (transition legality),
`slots.ts` (DST and capacity arithmetic), `hours.ts` (opening hours). Then the
money paths, which I have been verifying by hand in rolled-back transactions all
day — those checks should be a test suite, not a chat log.

**Add:** Vitest, unit tests on the three pure modules, and integration tests on the
ledger invariant (`sum(ledger_entries) == wallets.balance_minor`).

### 6.3 Rate limiting that survives a deploy

`checkThrottle` in `auth/actions.ts` is an in-process Map and says so. It resets on
deploy and does not span instances.

**Add:** Upstash Redis, and extend it to the top-up and booking endpoints, not just
auth.

### 6.4 Observability

Failures are `console.error` with good context — deliberately, and the messages are
diagnosable. But nobody is reading them. Several money paths log
`NEEDS MANUAL CORRECTION` and depend on somebody noticing.

**Add:** Sentry, and an alert on those specific log lines. A compensating action
nobody is told about is not a compensating action.

---

## 7. Where I would start

Given the goal is real users on real money:

1. **0.1 and 0.2** — an afternoon, and 0.1 is a live exposure
2. **0.4 cron** — an hour, and it is currently silently withholding refunds
3. **0.3 Razorpay** — the one thing between this and revenue
4. **1.2 lead with warranty** — mostly copy and badges over schema that exists,
   and it is the clearest gap against the incumbent
5. **6.2 tests on the pure modules** — before the surface grows further
6. **2.1 arrival window** and **4.3 availability in search** — the two conversion
   levers whose data is already there

Sections 2–5 are the product. Section 0 is the reason none of it counts yet.

---

## Appendix — what is already built

Worth stating, because the list above is all gaps and reads bleaker than the
codebase deserves.

Working and verified: the 12-state booking machine with RLS enforcement; DST-correct
slot generation; wallets and a zero-sum double-entry ledger; per-category platform
fees, snapshotted; a customer wallet with a phone-scannable UPI QR paying through a
mock sheet on our own origin; bills with a 5% rebate, capped at the job and
admin-approved; fee refunds on abandonment; paid shop enrollment with refund on
rejection; subscription tiers with derived quota and no renewal cron to go stale;
warranty and dispute flows; a programmatic SEO engine with a block schema and
server-side JSON-LD; three apps sharing one schema; and an RLS posture that has
been probed rather than assumed — migration 009 is worth reading as a document in
its own right.
