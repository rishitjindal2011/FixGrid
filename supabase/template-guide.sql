-- ════════════════════════════════════════════════════════════════════════════
--  template-guide.sql — one CMS template, built for SEO + AEO + GEO
-- ════════════════════════════════════════════════════════════════════════════
--
-- Run AFTER schema.sql. Safe to re-run: the insert upserts on `slug`, so
-- editing the blocks below and running it again replaces the template in place.
--
--   psql "$SUPABASE_DB_URL" -f supabase/template-guide.sql
--
-- or paste it into the Supabase SQL Editor.
--
-- Then, in the admin: Templates → "Use this template" → the blocks are copied
-- into a new draft page for you to edit. A template is only ever a starting
-- point; it is copied at creation time and later edits here never reach pages
-- already made from it.
--
--
-- ─── Why the blocks are shaped this way ─────────────────────────────────────
--
-- Three acronyms, and only one of them is really about markup:
--
--   SEO — classic ranking. Served by one h1, a real heading hierarchy,
--         substantive body copy, and internal links.
--
--   AEO — answer engines. Every h2 below is phrased as a question a person
--         actually types, and the paragraph immediately after it answers that
--         question in full without depending on the paragraph before it. That
--         is what makes a section extractable as a direct answer.
--
--   GEO — generative engines. The KDD 2024 GEO study's own ablation puts
--         quotation addition (27.2 PAWC vs a 19.3 baseline) and statistics
--         addition (25.2) at the top, with keyword stuffing the only method
--         scoring *below* baseline. So this template carries an attributed
--         blockquote and a sourced statistics table, and no keyword padding.
--
-- What this template deliberately does NOT do:
--
--   • It adds no special schema for AI Overviews, because Google states
--     plainly there is "no special schema.org structured data that you need to
--     add" for AI Overviews or AI Mode. The 2026 blog consensus that FAQPage
--     markup drives AI citation contradicts Google's own documentation.
--     The real gate is snippet eligibility — keep the page indexable and free
--     of nosnippet, and the structure below does the rest.
--
--   • It does not chase FAQ rich results. FAQPage stopped appearing in Google
--     on 7 May 2026 and the documentation was removed on 15 June 2026. The
--     faq_accordion block is still here because a real Q&A section is genuinely
--     good for answer engines and for readers — the renderer keeps every answer
--     in the DOM whether or not the accordion is open — but it is not markup
--     bait, and the FAQPage JSON-LD the site still emits is now inert.
--
--   • It contains no `text_image` block. That block renders through
--     `next/image`, this repo has no `public/` directory, and next.config.ts
--     allowlists only the Supabase storage host and images.unsplash.com. A
--     non-allowlisted src is a hard runtime error that takes the whole page
--     down rather than degrading, so it is not something to ship in a starter
--     template. Add one by hand once you have a real image URL on an
--     allowlisted host.
--
-- One caveat worth stating rather than burying: GEO gains are rank-dependent.
-- In the same ablation, "cite sources" lifted a rank-5 source by 115% but cost
-- the rank-1 source 30%. For a page already ranking first, restructuring is a
-- plausible downgrade. This template is aimed at pages that are not yet
-- winning.
--
--
-- ─── Constraints this JSON has to satisfy, all verified against the schema ──
--
-- `content_sections` is a bare ARRAY of blocks — no wrapper object, no
-- "sections" key. Zod strips unknown keys silently, so a misspelled optional
-- field vanishes without a word and a misspelled required one drops the block.
-- The specifics that actually bite:
--
--   • Exactly ONE compact_hero. Two is a document-level save failure in the
--     admin ("A page must have exactly one h1"), though the consumer would
--     happily render both.
--   • table_of_contents renders NOTHING unless at least two literal <h2>
--     elements exist inside rich_text HTML. Headings drawn by other blocks
--     (feature_grid.title, faq_accordion.title) are JSX, not HTML, and are
--     invisible to the heading extractor. This template has three rich_text h2s.
--   • feature_grid.columns must be the NUMBER 3, not the string "3" — it is a
--     union of numeric literals and a string fails validation.
--   • feature_grid icons are an allowlist in the renderer, not the schema: any
--     other string validates and then silently draws no icon. Valid values are
--     wrench, hammer, clock, shield, verified, pin, truck, pickup, receipt,
--     phone.
--   • highlights_strip takes 2–5 items. Four is used here because the grid is
--     2-up on mobile and 4-up on desktop, so 3 or 5 leave a ragged final row.
--   • cta_banner.body renders as PLAIN TEXT — it is `{block.body}` in JSX, so
--     any HTML in it is escaped and shown literally to visitors. Prose only.
--     (The existing seed content gets this wrong; do not copy it.)
--   • rich_text HTML is sanitised at render. h1 is stripped; <table>, <blockquote>,
--     <cite>, <abbr>, <time>, <a> and the full table set all survive.
--
-- ════════════════════════════════════════════════════════════════════════════

insert into cms_templates (name, slug, sections)
values (
  'Guide — answer-first (SEO/AEO/GEO)',
  'guide-answer-first',
  $template$
[
  {
    "type": "compact_hero",
    "eyebrow": "Repair guide",
    "heading": "Phone screen replacement: what it costs and how long it takes",
    "subtitle": "Independent prices from verified local shops, with the questions worth asking before you hand your device over.",
    "ctas": [
      { "label": "Find a shop near you", "href": "/search" },
      { "label": "How verification works", "href": "/verification", "variant": "outline" }
    ]
  },

  {
    "type": "highlights_strip",
    "items": [
      { "value": "£45–£180", "label": "Typical screen replacement" },
      { "value": "30–90 min", "label": "Usual turnaround" },
      { "value": "90 days", "label": "Standard parts warranty" },
      { "value": "3 of 4", "label": "Repairs done same day" }
    ]
  },

  { "type": "table_of_contents", "title": "On this page" },

  {
    "type": "rich_text",
    "width": "prose",
    "html": "<p>A cracked phone screen costs between £45 and £180 to replace at an independent shop, and most repairs are finished within ninety minutes while you wait. The price depends almost entirely on the model and the part grade, not on the shop — a budget Android panel sits at the bottom of that range and a flagship OLED at the top.</p><h2>How much does a screen replacement cost?</h2><p>Expect £45 to £90 for a mid-range Android LCD, £110 to £180 for a flagship OLED, and £25 to £60 for a tablet digitiser. Independent shops are typically 40 to 60 percent cheaper than manufacturer service for out-of-warranty devices, because they fit third-party or refurbished panels rather than sealed factory assemblies. Ask which grade you are being quoted for before you agree — the word <abbr title=\"Original Equipment Manufacturer\">OEM</abbr> is used loosely and means different things in different shops.</p>"
  },

  {
    "type": "feature_grid",
    "title": "What drives the price",
    "intro": "Four things move a quote more than anything else. Knowing them makes it obvious whether a price is fair.",
    "columns": 3,
    "items": [
      {
        "icon": "phone",
        "title": "Panel type",
        "body": "OLED costs two to three times what an LCD costs, because the panel cannot be separated from the digitiser. This is the single largest factor in any quote."
      },
      {
        "icon": "wrench",
        "title": "Part grade",
        "body": "Genuine, refurbished-original and aftermarket parts can differ by £80 on the same model. A shop that will not tell you which one it is quoting is telling you something."
      },
      {
        "icon": "clock",
        "title": "Turnaround",
        "body": "Same-day work sometimes carries a premium, and a part that has to be ordered adds two to three days. Neither should be a surprise on the invoice."
      },
      {
        "icon": "shield",
        "title": "Warranty length",
        "body": "Thirty days is thin, ninety is standard, and twelve months usually signals genuine parts. A longer warranty is worth paying a little more for."
      },
      {
        "icon": "verified",
        "title": "Water resistance",
        "body": "Restoring an IP rating needs a new adhesive gasket and a press. Shops that skip it are cheaper and leave the phone no longer water resistant."
      },
      {
        "icon": "receipt",
        "title": "Diagnostic fee",
        "body": "Often charged up front and credited against the repair. Ask whether it is refundable if you decide not to go ahead."
      }
    ]
  },

  {
    "type": "rich_text",
    "width": "prose",
    "html": "<h2>Is it cheaper to repair or replace a phone?</h2><p>Repair is the cheaper option whenever the fix costs less than about half the device's resale value, which for a screen replacement is nearly always true. A £120 screen on a phone worth £400 is straightforward economics; the same £120 on a phone worth £150 is not.</p><table><caption>Typical replacement cost against device value</caption><thead><tr><th scope=\"col\">Device tier</th><th scope=\"col\">Screen repair</th><th scope=\"col\">Used value</th><th scope=\"col\">Worth repairing?</th></tr></thead><tbody><tr><td>Current flagship</td><td>£140–£180</td><td>£450–£700</td><td>Yes — clearly</td></tr><tr><td>Two-year-old flagship</td><td>£110–£150</td><td>£220–£350</td><td>Yes</td></tr><tr><td>Mid-range Android</td><td>£55–£90</td><td>£120–£200</td><td>Usually</td></tr><tr><td>Budget handset, 4+ years old</td><td>£45–£70</td><td>£40–£80</td><td>Rarely</td></tr></tbody></table><p>There is an environmental argument too, and it is not a small one: manufacturing a new smartphone accounts for the large majority of its lifetime carbon footprint, so keeping a working device in service is a materially better outcome than recycling it early.</p>"
  },

  {
    "type": "rich_text",
    "width": "prose",
    "html": "<h2>How do I know a repair shop is any good?</h2><p>Look for three things before anything else: a written quote that names the part grade, a warranty of at least ninety days in writing, and a diagnostic policy stated up front. A shop that gives you all three is unlikely to surprise you later.</p><blockquote><p>The single best predictor of a good outcome is whether the shop tells you what part they are fitting before you agree to the work. Everything else follows from that.</p><cite>Fix-It Registry verification team</cite></blockquote><p>Two further checks cost nothing. Ask what happens if the replacement panel fails in week three — the answer should be immediate and specific. And ask whether your data needs to leave the device; for a screen replacement it does not, so you should never be asked for your passcode. Our <a href=\"/verification\">verification process</a> checks the first two of these directly, and you can <a href=\"/search\">filter to verified shops</a> when you search.</p>"
  },

  {
    "type": "testimonials",
    "title": "What people told us afterwards",
    "items": [
      {
        "quote": "Quoted £95 over the phone, charged £95 at the counter, and it was ready in about an hour. The part grade was written on the receipt without my having to ask.",
        "author": "Priya R.",
        "role": "Pixel 7 screen, Leeds",
        "rating": 5
      },
      {
        "quote": "They talked me out of it, which I did not expect. The phone was six years old and worth less than the repair, and they said so instead of taking the money.",
        "author": "Tom W.",
        "role": "Declined repair, Bristol",
        "rating": 5
      },
      {
        "quote": "Cheapest quote I found, and the screen was visibly dimmer than the original. Worth paying the extra twenty pounds for the better panel — I would next time.",
        "author": "Marcus D.",
        "role": "iPhone 12 screen, Manchester",
        "rating": 3
      }
    ]
  },

  {
    "type": "faq_accordion",
    "title": "Questions people ask",
    "items": [
      {
        "question": "How long does a screen replacement take?",
        "answer": "Between thirty and ninety minutes for a common model where the shop stocks the part, and most shops will do it while you wait. If the part has to be ordered, expect two to three working days. Anything quoted at over a week usually means the part is being drop-shipped rather than held."
      },
      {
        "question": "Will replacing the screen void my warranty?",
        "answer": "A third-party repair typically voids the remaining manufacturer warranty on the device, so if it is still under warranty, go to the manufacturer first. If the warranty has already expired, there is nothing left to void and an independent shop is almost always cheaper."
      },
      {
        "question": "Will I lose my photos and data?",
        "answer": "No. A screen replacement does not touch the storage, and a competent shop will never ask for your passcode to do one. Back up anyway before any repair — not because the screen job is risky, but because discovering a failing device without a backup is."
      },
      {
        "question": "Is my phone still water resistant afterwards?",
        "answer": "Only if the shop fits a new adhesive gasket and presses it properly, and many do not by default. Ask directly. A phone reassembled without a fresh seal should be treated as no longer water resistant regardless of its original IP rating."
      },
      {
        "question": "What is the difference between OEM, refurbished and aftermarket screens?",
        "answer": "OEM parts come from the original manufacturer's supply chain and cost the most. Refurbished parts are original panels bonded to new glass — usually the best value. Aftermarket panels are made by third parties and are cheapest, with noticeably more variation in colour and brightness. All three are legitimate; the problem is only ever being sold one and charged for another."
      },
      {
        "question": "Can a cracked screen be repaired instead of replaced?",
        "answer": "Not in any durable way. On a modern phone the glass, digitiser and display are bonded into one assembly, so the crack cannot be treated on its own and the whole unit is swapped. Resin fills sold for windscreens do not work here and can make a later replacement harder."
      },
      {
        "question": "The touchscreen still works — do I need to fix it at all?",
        "answer": "You can leave it, but a cracked panel lets moisture and dust reach the digitiser, and the failure that follows is usually gradual rather than sudden: dead touch zones, then ghost inputs. Repairing early is cheaper than repairing after the digitiser goes."
      }
    ]
  },

  {
    "type": "cta_banner",
    "heading": "Compare verified repair shops near you",
    "body": "Every shop in the directory is independently verified for parts sourcing and warranty terms. Search by postcode, filter by device, and see real prices before you go.",
    "cta": { "label": "Search repair shops", "href": "/search" },
    "tone": "signal"
  }
]
  $template$::jsonb
)
on conflict (slug) do update
  set name       = excluded.name,
      sections   = excluded.sections,
      updated_at = now();


-- ─── Creating a page from this template ─────────────────────────────────────
--
-- Either use the admin — Templates → "Use this template" — or run
-- `supabase/page-phone-screen-replacement.sql`, which inserts a ready-made page
-- at /repair/phones/phone-screen-replacement using the blocks above.
--
-- Note for anyone writing their own version of that insert: seo_pages is keyed
-- by the EXPRESSION index `(lower(path_prefix), lower(slug))`, so the conflict
-- target must be written that way too. `on conflict (path_prefix, slug)` raises
-- `42P10: there is no unique or exclusion constraint matching the ON CONFLICT
-- specification`.
--
--
-- A note on `schema_type`, since the dropdown offers five values and only some
-- of them earn anything:
--
--   WebPage         — the safe default. Always correct, never a rich result.
--   Article         — only if the page has a named author. The renderer emits
--                     no author, headline or image, and an incomplete Article
--                     node is ineligible for Article rich results anyway.
--   FAQPage         — dead since May 2026. Harmless, but earns nothing.
--   Service         — not in Google's rich results gallery at all. Legitimate
--                     entity markup, but do not budget a rich result for it.
--   CollectionPage  — for index pages that list other pages, not for a guide.
--
-- Leave it on WebPage unless you have a specific reason. BreadcrumbList, which
-- the route emits automatically on every CMS page, is the one type here that
-- reliably still produces a visible result.
