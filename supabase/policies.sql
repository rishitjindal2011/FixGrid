-- ════════════════════════════════════════════════════════════════════════════
-- FixGrid — Row Level Security
--
-- The original spec said "RLS disabled on SEO tables for admin ease". That is
-- the single most dangerous line in the document: with RLS off, the anon key
-- shipped to every browser can read every draft page and, depending on grants,
-- write to them. Drafts are unreleased marketing copy and seo_admins holds
-- password hashes.
--
-- Instead: RLS ON everywhere. Anonymous users may read published, indexed
-- pages only. The admin dashboard authenticates locally and talks to Supabase
-- with the service-role key, which bypasses RLS by design. Admin ease is
-- preserved; the public exposure is not.
-- ════════════════════════════════════════════════════════════════════════════

alter table users             enable row level security;
alter table fixer_profiles    enable row level security;
alter table repair_categories enable row level security;
alter table fixer_categories  enable row level security;
alter table reviews           enable row level security;
alter table seo_global        enable row level security;
alter table cms_templates     enable row level security;
alter table seo_pages         enable row level security;
alter table seo_redirects     enable row level security;
alter table seo_admins        enable row level security;

-- ─── Directory: world-readable, owner-writable ──────────────────────────────

drop policy if exists "profiles readable by all" on fixer_profiles;
create policy "profiles readable by all"
  on fixer_profiles for select
  using (true);

drop policy if exists "owner inserts own profile" on fixer_profiles;
create policy "owner inserts own profile"
  on fixer_profiles for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "owner updates own profile" on fixer_profiles;
create policy "owner updates own profile"
  on fixer_profiles for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "owner deletes own profile" on fixer_profiles;
create policy "owner deletes own profile"
  on fixer_profiles for delete
  to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "categories readable by all" on repair_categories;
create policy "categories readable by all"
  on repair_categories for select using (true);

drop policy if exists "fixer categories readable by all" on fixer_categories;
create policy "fixer categories readable by all"
  on fixer_categories for select using (true);

drop policy if exists "owner manages own category links" on fixer_categories;
create policy "owner manages own category links"
  on fixer_categories for all
  to authenticated
  using (exists (
    select 1 from fixer_profiles f
     where f.id = fixer_categories.fixer_id and f.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from fixer_profiles f
     where f.id = fixer_categories.fixer_id and f.owner_id = (select auth.uid())
  ));

-- ─── Users ──────────────────────────────────────────────────────────────────

drop policy if exists "public profiles readable" on users;
create policy "public profiles readable"
  on users for select using (true);

drop policy if exists "user updates self" on users;
create policy "user updates self"
  on users for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ─── Reviews: readable by all, written by the author, never for own shop ────

drop policy if exists "reviews readable by all" on reviews;
create policy "reviews readable by all"
  on reviews for select using (true);

drop policy if exists "customer writes own review" on reviews;
create policy "customer writes own review"
  on reviews for insert
  to authenticated
  with check (
    customer_id = (select auth.uid())
    and not exists (
      select 1 from fixer_profiles f
       where f.id = reviews.fixer_id and f.owner_id = (select auth.uid())
    )
  );

drop policy if exists "customer edits own review" on reviews;
create policy "customer edits own review"
  on reviews for update
  to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

drop policy if exists "customer deletes own review" on reviews;
create policy "customer deletes own review"
  on reviews for delete
  to authenticated
  using (customer_id = (select auth.uid()));

-- ─── SEO tables: public reads are narrow, writes are service-role only ──────

drop policy if exists "published pages readable" on seo_pages;
create policy "published pages readable"
  on seo_pages for select
  using (status = 'published');

drop policy if exists "global seo readable" on seo_global;
create policy "global seo readable"
  on seo_global for select using (true);

drop policy if exists "redirects readable" on seo_redirects;
create policy "redirects readable"
  on seo_redirects for select using (true);

-- cms_templates and seo_admins intentionally have NO policies. RLS is enabled
-- with zero permissive policies, so anon/authenticated see nothing at all.
-- Only the service-role key (which bypasses RLS) can touch them.

-- ─── Grants ─────────────────────────────────────────────────────────────────
-- Belt and braces: even if a policy is later added by mistake, anon has no
-- write privilege on CMS tables at the SQL level.

revoke all on seo_pages, cms_templates, seo_redirects, seo_global, seo_admins
  from anon;
grant select on seo_pages, seo_redirects, seo_global to anon;

revoke all on seo_admins from authenticated;
