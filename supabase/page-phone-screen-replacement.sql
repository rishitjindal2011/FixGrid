-- ════════════════════════════════════════════════════════════════════════════
--  page-phone-screen-replacement.sql — one page, built from the guide template
-- ════════════════════════════════════════════════════════════════════════════
--
-- Run AFTER supabase/template-guide.sql, which creates the template this page
-- copies its blocks from.
--
--   psql "$SUPABASE_DB_URL" -f supabase/page-phone-screen-replacement.sql
--
-- or paste it into the Supabase SQL Editor.
--
--
-- ─── What this creates ──────────────────────────────────────────────────────
--
--   Title       Phone Screen Replacement Cost
--   URL         /repair/phones/phone-screen-replacement
--   Status      published, but NOINDEX (is_indexed = false)
--
-- The path is free: every existing page (about, privacy, terms, join,
-- verification) sits at the site root with an empty path_prefix, and the
-- consumer app has no `/repair` route, so the [...slug] catch-all resolves it.
--
--
-- ─── Read this before you set it live ───────────────────────────────────────
--
-- It ships as `published` so the page actually renders and you can see the
-- template working — a draft would 404 for anyone without the preview cookie.
-- It ships `is_indexed = false` for two specific reasons, and both are real:
--
--   1. THE THREE TESTIMONIALS ARE INVENTED. Priya R., Tom W. and Marcus D. do
--      not exist and neither do their repairs. Publishing fabricated customer
--      reviews as indexable content is deceptive to readers and, in the UK,
--      regulated conduct under the DMCC Act 2024 — the CMA has enforcement
--      powers over fake reviews. Replace them with real ones or delete the
--      block. This is not a style note.
--
--   2. Every price in the copy is illustrative. £45–£180, the 90-day warranty,
--      "3 of 4 repairs done same day" — I made those figures up to demonstrate
--      the statistics-table structure that generative engines reward. Sourced
--      numbers are the whole point of that block; unsourced ones are the thing
--      it is meant to replace.
--
-- Once the copy is yours and the testimonials are real:
--
--   update seo_pages set is_indexed = true
--    where path_prefix = 'repair/phones' and slug = 'phone-screen-replacement';
--
--
-- ─── On conflict: do NOTHING, deliberately ──────────────────────────────────
--
-- The template upserts with `do update` because a template is repo-owned. This
-- page does not, because the moment you open it in the admin it becomes yours.
-- Re-running this file must never silently overwrite edits you made in the
-- editor. To rebuild it from scratch, delete it first:
--
--   delete from seo_pages
--    where path_prefix = 'repair/phones' and slug = 'phone-screen-replacement';
--
-- The conflict target is `(lower(path_prefix), lower(slug))` and not
-- `(path_prefix, slug)`. seo_pages_path_key is an EXPRESSION index, and
-- ON CONFLICT matches an index by its exact expression list — naming the bare
-- columns raises `42P10: there is no unique or exclusion constraint matching
-- the ON CONFLICT specification`.
--
-- ════════════════════════════════════════════════════════════════════════════

insert into seo_pages (
  title,
  slug,
  path_prefix,
  status,
  template_id,
  content_sections,
  meta_title,
  meta_description,
  keywords,
  schema_type,
  is_indexed,
  is_followed
)
select
  'Phone Screen Replacement Cost',
  'phone-screen-replacement',
  'repair/phones',
  'published',
  t.id,

  -- The blocks are COPIED from the template, not referenced. Editing the
  -- template later will not reach this page — that is what makes a template a
  -- starting point rather than a layout, and why the Templates screen is
  -- read-only in the admin.
  t.sections,

  'Phone screen replacement cost | Fix-It Registry',
  'Independent phone screen replacement costs £45–£180 and usually takes under 90 minutes. Compare verified local repair shops before you book.',

  -- text[], not a comma-separated string. If this errors with "column keywords
  -- is of type text but expression is of type text[]", your database predates
  -- the type repair — re-run supabase/schema.sql, which now fixes it.
  array[
    'phone screen replacement',
    'screen repair cost',
    'cracked screen repair'
  ],

  -- WebPage, not Article: the renderer emits no author, headline or image, and
  -- an incomplete Article node is ineligible for Article rich results anyway.
  -- BreadcrumbList is emitted automatically by the route.
  'WebPage',

  false,  -- is_indexed — see the warning above
  true    -- is_followed
from cms_templates t
where t.slug = 'guide-answer-first'
on conflict (lower(path_prefix), lower(slug)) do nothing;


-- ─── Confirm it landed ──────────────────────────────────────────────────────
--
-- Zero rows means template-guide.sql has not been run yet: the insert selects
-- FROM cms_templates, so with no matching template there is no row to insert
-- and the statement succeeds having done nothing at all.

select
  p.title,
  '/' || p.path_prefix || '/' || p.slug          as url,
  p.status,
  p.is_indexed,
  jsonb_array_length(p.content_sections)         as blocks,
  t.name                                         as from_template
from seo_pages p
left join cms_templates t on t.id = p.template_id
where p.path_prefix = 'repair/phones'
  and p.slug = 'phone-screen-replacement';
