# Fix-It Registry

A directory of local repair shops, plus the CMS and SEO tooling that runs it.

Two Next.js 16 apps against one Supabase project:

| | Path | What it is |
| --- | --- | --- |
| Consumer | `.` | Public site: search + map directory, expert profiles, CMS-rendered landing pages, sitemaps |
| Admin | `seo-admin/` | Internal CMS: page editor, redirects, global SEO defaults, preview and HTML export |

They share a database and a `Database` type, nothing else. No shared package, no
monorepo tooling — the coupling is the schema, and keeping it that way means
either app can be deployed without rebuilding the other.

---

## Setup

Requires Node 20+ and a Supabase project.

```bash
npm install
cd seo-admin && npm install && cd ..
```

Each app has its own `.env.example`. Copy both, then fill them in:

```bash
cp .env.example .env.local
cp seo-admin/.env.example seo-admin/.env.local
```

Consumer app (`.env.local`):

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000    # this app's own canonical origin
PREVIEW_SECRET=<32+ bytes, shared with the admin>
```

Admin app (`seo-admin/.env.local`):

```ini
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
NEXT_PUBLIC_APP_URL=http://localhost:3000     # the *consumer* app's origin
ADMIN_JWT_SECRET=<32+ bytes>
PREVIEW_SECRET=<same value as the consumer app>
```

The two origin variables are named differently because they mean different
things: `NEXT_PUBLIC_SITE_URL` is the origin the consumer app canonicalises
*itself* to, while `NEXT_PUBLIC_APP_URL` is where the admin sends preview and
export requests. In production they usually hold the same value, and confusing
them produces canonical tags pointing at an origin the previews never reach.

The admin has no anon key because it never uses one — every query goes through
the service-role client behind a session check.

Generate both secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`PREVIEW_SECRET` must match across the apps; it is what lets the admin open a
draft session on the consumer app without that endpoint being open to the world.
`SUPABASE_SERVICE_ROLE_KEY` bypasses every row-level policy, so it belongs in
`.env.local` and your host's secret store, nowhere else — never in
`.env.example`, and never behind a `NEXT_PUBLIC_` prefix.

Then push the schema and seed. `db:push` shells out to `psql`, so it reads the
direct Postgres connection string rather than the API URL — export it first
(Supabase dashboard → Project Settings → Database → Connection string):

```bash
export SUPABASE_DB_URL='postgresql://postgres:<pw>@db.<project>.supabase.co:5432/postgres'

npm run db:push          # schema.sql → policies.sql → seed.sql
npm run seed:seo         # category pages + templates, written as drafts
cd seo-admin && npm run admin:hash   # prints a bcrypt hash + the INSERT for it
```

No `psql` installed? The three files are plain SQL with no client-side
directives, so pasting each into the Supabase dashboard's SQL Editor and running
them **in that order** does exactly the same thing.

All three are idempotent and additive — they create nothing they would have to
drop, and re-running them on a populated database updates rows in place rather
than duplicating them. This matters more than it sounds: `create table if not
exists` skips an *existing* table wholesale, so a database provisioned before a
column was added stays behind forever and the app fails on the missing column at
runtime. `users.display_name`, `repair_categories.sort_order` and the
`search_fixers` signature were all found exactly that way. Every column an older
deployment can lag on is therefore repeated as an `alter table … add column if
not exists` immediately after its table.

The same trap has two further faces, and `schema.sql` closes both:

- **`create unique index if not exists` matches on the index *name*, not its
  definition.** Postgres auto-names an inline `unique (slug)` as
  `<table>_slug_key` — the exact name the current schema wants for its
  `lower(slug)` expression index. The create is then a silent no-op, and every
  `on conflict (lower(slug))` in `seed.sql` fails with `42P10`. The
  reconciliation blocks test `pg_indexes.indexdef` for the expression itself and
  drop whatever is holding the name.
- **A column an older schema declared `NOT NULL` with no default blocks every
  insert.** `fixer_profiles.user_id`, the predecessor of `owner_id`, is how this
  surfaced. The last section of `schema.sql` relaxes NOT NULL on any such column
  that the current schema does not define. It **does not drop the column** — the
  data stays, it simply stops being mandatory — and it prints a `NOTICE` naming
  each one so you can drop them by hand once you have confirmed they are dead.
  Watch the SQL Editor's output on the first run.

`db:seed` runs `seed.sql` alone, for refreshing the sample directory without
re-running DDL.

`seed:seo` is idempotent — re-running it updates copy in place. It will not touch
`status` or `published_at` on a page that already exists, and it creates new pages
as drafts, because bulk-publishing generated pages before a human has read them
is how thin content reaches an index.

`admin:hash` prints the SQL to create your first admin. Nothing else creates one;
there is no self-registration.

```bash
npm run dev                  # consumer on :3000
cd seo-admin && npm run dev  # admin on :3001, port is pinned in the script
```

## Checks

Both apps expose the same two scripts, and both pass clean:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
```

`typecheck` is the one that matters most here. `strict` and
`noUncheckedIndexedAccess` are both on, so an unguarded array index is a
compile error rather than a runtime `undefined`.

---

## Where things live

**Consumer** — `src/lib/cms/blocks.ts` is the source of truth for the block
schema; the admin has a copy and the seed script validates against it. Renderers
are in `src/components/cms/`. `src/lib/site.ts` centralises origin handling and
throws in production if the canonical origin is loopback. `src/proxy.ts` applies
`seo_redirects` and refreshes the Supabase session (Next 16 renamed this
convention from `middleware`; the file and its exported function must be renamed
together or it is silently never invoked).

**Consumer auth** — `src/lib/auth/actions.ts` holds every mutation; the shared
`AuthState` shape lives in `src/lib/auth/state.ts` rather than beside the
actions, because a `"use server"` module may only export async functions and a
plain `export const` there throws at module evaluation. Forms are in
`src/components/auth/`, routes at `/login`, `/signup`, `/forgot-password`,
`/reset-password`, with the OAuth/recovery landing at `src/app/auth/callback/`.

**Admin** — `src/lib/pages/actions.ts`, `redirects/actions.ts` and
`settings/actions.ts` hold every mutation; each one re-checks the session, so
authorisation does not depend on the UI having hidden a button.
`src/lib/auth/session.ts` is deliberately free of `server-only` because
`src/proxy.ts` imports it, and it uses `jose` rather than `bcryptjs` for the
same reason — the Edge runtime has no Node crypto. Password comparison stays in
`lib/auth/actions.ts`, which runs on Node. The admin's `proxy.ts` is its *only*
route guard, so the Next 16 rename matters more here than in the consumer app: a
file still named `middleware.ts`, or a `proxy.ts` still exporting `middleware`,
is never invoked and publishes the whole dashboard anonymously — with no error.

**Seeding** is split in two on purpose: `scripts/seed-content.ts` is the copy and
block assembly, `scripts/seed-seo-pages.ts` is the Supabase transport. They
change for completely different reasons.

---

## Deliberate deviations from the original spec

Seven places where the spec was not followed. Each was a judgement call, and
each is commented at the site of the decision as well as listed here.

**1. RLS is enabled on the SEO tables, not disabled.** The spec asked for it off
"for admin ease". With it off, the anon key — which ships to every browser —
could read every unpublished draft and, more seriously, `seo_admins`, including
`password_hash`. Admin ease is preserved by the service-role key, which bypasses
RLS by design. This is the one deviation that would be a security incident if
reversed.

**2. Table-of-contents derivation is server-side**, not client DOM scanning. The
client approach means the TOC pops in after paint, needs hand-authored heading
ids, and risks a hydration mismatch. Headings are parsed out of the block content
during render instead.

**3. FAQ structured data is emitted server-side and consolidated.** Crawlers are
unreliable about client-injected JSON-LD, and two FAQ blocks on one page would
otherwise emit two competing `FAQPage` nodes — which is a structured-data error,
not just redundancy.

**4. Schema additions:** `timezone` on `fixer_profiles` (an "open now" badge is
wrong without it), trigger-maintained `rating_avg` / `rating_count` (so listing
queries do not aggregate reviews on every request), an explicit
`fixer_categories` join table, and `UNIQUE (path_prefix, slug)` on `seo_pages`
(two rows resolving to one URL is unresolvable at render time).

**5. HTML is sanitised at render, not only on save.** Rows reach the database
from the admin, the seed script, and psql. Only the renderer sees all three.

**6. Templates are read-only in the admin.** A template is a starting set of
blocks, copied at creation time. An edit screen would strongly imply that
changes propagate to pages already made from it, which cannot happen. They are
seeded from version control instead.

**7. Redirect deletion is owner-only while editing is editor-level.** Deleting a
rule resurrects a 404 for every inbound link that depended on it, and unlike a
page there is no archived state to fall back to.

## Known limits

Admin sessions are stateless JWTs, so revoking one before it expires means
rotating `ADMIN_JWT_SECRET` and logging everyone out. Redirect chains longer
than one hop are not detected — only direct self-loops are — because a chain is
a performance smell rather than an outage. The consumer app caches
`seo_redirects`, so a new rule takes up to one cache interval to take effect.
