-- ════════════════════════════════════════════════════════════════════════════
-- Fix-It Registry — seed data
--
-- Run order:  schema.sql  →  policies.sql  →  seed.sql
-- Idempotent: every statement upserts on a natural key, so re-running refreshes
-- the rows rather than duplicating them.
--
-- Why this file exists: schema.sql's header has always named it in the run
-- order, but it was never written. An empty `repair_categories` makes every
-- filter chip a dead end and an empty `fixer_profiles` makes the homepage and
-- /search render their empty states — which reads as "the database is broken"
-- rather than "the database is empty".
--
-- Category slugs are a contract between three places: these rows, CATEGORY_SEEDS
-- in scripts/seed-content.ts, and the footer links in
-- src/components/site-footer.tsx. Keep all three in step.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Categories ─────────────────────────────────────────────────────────────

insert into repair_categories (name, slug, description, icon, sort_order) values
  ('Phone Repair',     'phones',     'Screens, batteries, charging ports and water damage on phones and tablets.',   'Smartphone',     10),
  ('Laptop Repair',    'laptops',    'Keyboards, hinges, thermal work, storage upgrades and board-level faults.',    'Laptop',         20),
  ('Appliance Repair', 'appliances', 'Washing machines, fridges, ovens, dishwashers and small kitchen appliances.',   'WashingMachine', 30),
  ('Bicycle Repair',   'bicycles',   'Wheels, drivetrains, brakes, servicing and e-bike electrics.',                  'Bike',           40),
  ('Watch Repair',     'watches',    'Battery changes, seals, crystals, straps and mechanical movement servicing.',   'Watch',          50)
on conflict (lower(slug)) do update
  set name        = excluded.name,
      description = excluded.description,
      icon        = excluded.icon,
      sort_order  = excluded.sort_order;

-- ─── Shops ──────────────────────────────────────────────────────────────────
--
-- Ten profiles, deliberately varied along every axis the UI branches on: with
-- and without coordinates, verified and not, all three service models, a shop
-- open seven days and one closed two, a Saturday half-day expressed as an
-- `hours` override, and three timezones. Seeding ten near-identical rows would
-- leave the open/closed strip, the map fallback and the service filters
-- exercised only on their happy paths.
--
-- `rating_avg` / `rating_count` are omitted on purpose: the reviews trigger owns
-- them, and writing them here would put the denormalised aggregate out of step
-- with the rows it claims to summarise.

-- `is_hidden` is listed explicitly and set false on every row. Migration 002
-- defaults the column to true — the safe default for a user submission awaiting
-- review — so a seed that omitted it would insert ten shops the directory
-- cannot show, and the site would come up empty with no error to explain why.
insert into fixer_profiles (
  slug, shop_name, bio, address, lat, lng, timezone, verified, photos,
  offers_in_shop, offers_home_service, offers_pickup_drop,
  working_days, opening_time, closing_time, hours,
  contact_phone, contact_email, is_hidden
) values
  (
    'northgate-phone-clinic', 'Northgate Phone Clinic',
    E'Two benches, two technicians, and a parts drawer covering every iPhone back to the SE plus most Samsung A- and S-series.\n\nScreens and batteries are same-day when the part is on the shelf, which for common models it usually is. Board-level work — charging circuits, backlight faults, liquid damage — goes on the microscope bench and takes two to three days, because that is diagnosis first and soldering second.\n\nWe will tell you when a repair is not worth doing. If the quote lands near half of what the handset is worth secondhand, you should hear that before you pay, not after.',
    '14 Northgate Street, Ashfield', 51.5142, -0.0931, 'Europe/London', true,
    array[
      'https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=1200&q=80',
      'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=1200&q=80'
    ],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '09:00', '18:00',
    '{"sat": {"open": "10:00", "close": "14:00"}}'::jsonb,
    '+44 20 7946 0102', 'bench@northgatephone.example', false
  ),
  (
    'brightwell-laptop-works', 'Brightwell Laptop Works',
    E'Laptop specialists: hinges, keyboards, screens, thermal repastes, storage and memory upgrades, and DC jack replacement.\n\nMost jobs are done inside 48 hours. We stock common hinge assemblies for Dell Latitude, ThinkPad T-series and MacBook Pro, which is where the wait on a laptop repair almost always is.\n\nData comes first. Nothing is wiped, reimaged or upgraded without your explicit go-ahead, and a failing drive gets imaged before anyone touches it.',
    '221 Brightwell Road, Ashfield', 51.5201, -0.0854, 'Europe/London', true,
    array['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri}', '09:30', '17:30', '{}'::jsonb,
    '+44 20 7946 0187', 'repairs@brightwelllaptops.example', false
  ),
  (
    'halloway-appliance-service', 'Halloway Appliance Service',
    E'Washing machines, dishwashers, fridges, freezers and ovens — in your kitchen rather than ours, because a large appliance is not worth moving twice.\n\nThe van carries the common failure parts: pumps, door seals, heating elements, thermostats and drive belts. Roughly seven visits in ten are finished on the first call.\n\nThe call-out fee covers diagnosis and the first half-hour, and it comes off the bill if you go ahead with the repair.',
    '5 Halloway Lane, Ashfield', 51.5088, -0.1042, 'Europe/London', true,
    array['https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=1200&q=80'],
    false, true, false,
    '{mon,tue,wed,thu,fri,sat}', '08:00', '18:00', '{}'::jsonb,
    '+44 20 7946 0244', 'bookings@hallowayappliance.example', false
  ),
  (
    'the-spoke-room', 'The Spoke Room',
    E'A bike shop that mostly repairs bikes. Wheel builds and truing, drivetrain replacement, hydraulic brake bleeds, gear indexing and full services.\n\nE-bike work too: motor diagnostics, battery health checks and controller faults on Bosch, Shimano Steps and Bafang systems.\n\nA safety check is free and takes ten minutes. If your brakes are marginal, we would rather find that out here than have you find it out on a hill.',
    '88 Canal Walk, Ashfield', 51.5265, -0.0798, 'Europe/London', false,
    array['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80'],
    true, false, false,
    '{tue,wed,thu,fri,sat,sun}', '10:00', '18:00',
    '{"sun": {"open": "11:00", "close": "16:00"}}'::jsonb,
    '+44 20 7946 0311', 'hello@spokeroom.example', false
  ),
  (
    'kestrel-watch-atelier', 'Kestrel Watch & Clock Atelier',
    E'Battery and seal changes while you wait. Crystal replacement, strap and bracelet fitting, and pressure testing to 10 ATM on the premises.\n\nMechanical servicing — full strip, clean, lubricate and regulate — goes to the bench and takes three to four weeks. That is the honest timeline for a movement done properly; anyone quoting three days is not doing all of it.\n\nVintage and inherited pieces welcome. We photograph the movement before and after, so you can see what was actually done.',
    '3 Merchant Row, Ashfield', 51.5133, -0.0887, 'Europe/London', true,
    array['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00', '17:00', '{}'::jsonb,
    '+44 20 7946 0356', 'bench@kestrelwatch.example', false
  ),
  (
    'meridian-device-care', 'Meridian Device Care',
    E'Phones and laptops under one roof, with a collection service across the city — we pick the device up, repair it, and bring it back.\n\nEvery job is quoted before work starts, and the quote is what you pay. If we open a device and find a second fault, you get a call, not a surprise on the invoice.\n\nOpen seven days, because devices break at the weekend and most benches are shut then.',
    '47 Meridian Parade, Ashfield', 51.4998, -0.1229, 'Europe/London', false,
    array['https://images.unsplash.com/photo-1601972602288-3be527b4f18a?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat,sun}', '09:00', '20:00', '{}'::jsonb,
    '+44 20 7946 0420', 'care@meridiandevice.example', false
  ),
  (
    'ironmonger-white-goods', 'Ironmonger White Goods',
    E'Third-generation appliance engineers. We repair what most people are told to replace: drum bearings, control boards, compressor faults and oven element wiring.\n\nWorkshop repairs for small appliances, home visits for anything plumbed or heavy. Pickup can be arranged for the awkward middle ground.\n\nParts are sourced OEM where they exist and pattern where they do not, and we tell you which you are getting.',
    'Unit 9, Ironmonger Yard, Ashfield', 51.5310, -0.1005, 'Europe/London', true,
    array['https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri}', '08:30', '17:00', '{}'::jsonb,
    '+44 20 7946 0498', 'workshop@ironmongerwhitegoods.example', false
  ),
  (
    'pennine-cycle-workshop', 'Pennine Cycle Workshop',
    E'Touring and gravel bike specialists, and the only bench in the area doing frame alignment and dropout repair in-house.\n\nWe also do a winter service package: full strip, bearing replacement through the frame, cable and housing renewal, and a re-index. Book it in October, not February.\n\nNo appointment needed for a puncture or a broken spoke — walk in and we will do it while you wait.',
    '12 Pennine Street, Kirkburn', 53.7961, -1.5478, 'Europe/London', false,
    array['https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&q=80'],
    true, false, false,
    '{wed,thu,fri,sat}', '09:00', '17:30', '{}'::jsonb,
    '+44 113 496 0021', 'bench@penninecycle.example', false
  ),
  (
    'harbourview-mobile-repair', 'Harbourview Mobile Repair',
    E'A mobile bench: we come to your home or office and do the repair on the spot. Screens, batteries and charging ports on phones and tablets, typically in under an hour.\n\nNo shopfront, which is why there is no map pin here — we cover the whole metropolitan area and quote by postcode when you call.\n\nEvery repair carries a twelve-month warranty on the part and the labour, honoured wherever you are in the coverage area.',
    'Mobile service — greater Ashfield area', null, null, 'Europe/London', false,
    '{}',
    false, true, false,
    '{mon,tue,wed,thu,fri,sat}', '08:00', '19:00', '{}'::jsonb,
    '+44 20 7946 0555', 'dispatch@harbourviewmobile.example', false
  ),
  (
    'sundial-clockworks', 'Sundial Clockworks',
    E'Longcase, carriage and mantel clocks, plus mechanical wristwatches. Movement servicing, mainspring replacement, wheel and pivot work, and dial restoration.\n\nHouse calls for longcase clocks, because a clock that has stood in one place for eighty years does not travel well and usually needs setting in beat where it stands.\n\nWork is quoted after a strip-down assessment. That assessment is chargeable and comes off the final bill.',
    '61 Old Dial Street, Kirkburn', 53.7902, -1.5561, 'Europe/London', true,
    array['https://images.unsplash.com/photo-1495856458515-0637185db551?w=1200&q=80'],
    true, true, false,
    '{tue,wed,thu,fri}', '10:00', '16:30', '{}'::jsonb,
    '+44 113 496 0077', 'workshop@sundialclockworks.example', false
  )
on conflict (lower(slug)) do update
  set shop_name           = excluded.shop_name,
      bio                 = excluded.bio,
      address             = excluded.address,
      lat                 = excluded.lat,
      lng                 = excluded.lng,
      timezone            = excluded.timezone,
      verified            = excluded.verified,
      photos              = excluded.photos,
      offers_in_shop      = excluded.offers_in_shop,
      offers_home_service = excluded.offers_home_service,
      offers_pickup_drop  = excluded.offers_pickup_drop,
      working_days        = excluded.working_days,
      opening_time        = excluded.opening_time,
      closing_time        = excluded.closing_time,
      hours               = excluded.hours,
      contact_phone       = excluded.contact_phone,
      contact_email       = excluded.contact_email,
      -- Re-seeding republishes. Without this line a seeded shop that had been
      -- hidden by hand would stay invisible after a refresh, and the only clue
      -- would be a shop missing from the directory for no stated reason.
      is_hidden           = excluded.is_hidden;

-- ─── Shop ↔ category links ──────────────────────────────────────────────────
--
-- Joined by slug rather than by literal uuid so this survives a database where
-- the rows above already existed with different generated ids.

insert into fixer_categories (fixer_id, category_id)
select f.id, c.id
  from (values
    ('northgate-phone-clinic',      'phones'),
    ('brightwell-laptop-works',     'laptops'),
    ('brightwell-laptop-works',     'phones'),
    ('halloway-appliance-service',  'appliances'),
    ('the-spoke-room',              'bicycles'),
    ('kestrel-watch-atelier',       'watches'),
    ('meridian-device-care',        'phones'),
    ('meridian-device-care',        'laptops'),
    ('ironmonger-white-goods',      'appliances'),
    ('pennine-cycle-workshop',      'bicycles'),
    ('harbourview-mobile-repair',   'phones'),
    ('sundial-clockworks',          'watches')
  ) as link (fixer_slug, category_slug)
  join fixer_profiles    f on lower(f.slug) = link.fixer_slug
  join repair_categories c on lower(c.slug) = link.category_slug
on conflict (fixer_id, category_id) do nothing;

-- ─── Standing CMS pages ─────────────────────────────────────────────────────
--
-- The footer links to /about, /privacy, /terms, /join and /verification. All
-- five resolve through the catch-all in src/app/[...slug]/page.tsx, which reads
-- `seo_pages` — so with no rows here every one of them was a 404 in the footer
-- of every page on the site.
--
-- `content_sections` must satisfy ContentSectionsSchema in src/lib/cms/blocks.ts;
-- an invalid block is dropped at render rather than throwing, which would make a
-- typo here look like a blank page.

insert into seo_pages (
  title, slug, path_prefix, status, content_sections,
  meta_title, meta_description, keywords, schema_type, is_indexed, is_followed
) values
  (
    'About Fix-It Registry', 'about', '', 'published',
    '[
      {"type":"compact_hero","eyebrow":"About","heading":"We are a directory, not a middleman","subtitle":"Fix-It Registry lists local repair shops with their real hours and their own phone numbers. We do not take a cut of your repair."},
      {"type":"rich_text","width":"prose","html":"<p>Most repair directories exist to sell leads. A shop pays to appear, you fill in a form, and the form is sold to whoever bid highest. The shop you actually wanted may not be listed at all.</p><p>This one works differently. Listings are free, ranking is by rating and verification rather than by payment, and every profile carries the shop''s own phone number and address. When you call, you are calling them.</p><h2>What verified means</h2><p>A verified badge means we confirmed the business exists at the address given and that the phone number reaches it. It is not a quality judgement — that is what the ratings are for.</p><h2>How ratings work</h2><p>Only signed-in customers can leave a review, one per shop, and shop owners cannot review their own listing. Editing an existing review replaces it rather than adding a second, so a shop cannot inflate its average by asking a happy customer to post again.</p>"},
      {"type":"highlights_strip","items":[{"value":"0%","label":"commission on repairs"},{"value":"Free","label":"to list a shop"},{"value":"1","label":"review per customer, per shop"}]},
      {"type":"cta_banner","heading":"Looking for a repair?","body":"Search by what broke, filter by whether they come to you, and call them directly.","cta":{"label":"Browse experts","href":"/search"}}
    ]'::jsonb,
    'About Fix-It Registry — a repair directory that takes no commission',
    'Fix-It Registry lists verified local repair shops with real hours and direct phone numbers. Free to list, no lead fees, no commission on repairs.',
    array['about fix-it registry','repair directory','local repair shops'],
    'AboutPage', true, true
  ),
  (
    'Privacy Policy', 'privacy', '', 'published',
    '[
      {"type":"compact_hero","eyebrow":"Legal","heading":"Privacy policy","subtitle":"What we collect, why, and how to get rid of it."},
      {"type":"rich_text","width":"prose","html":"<p>This is a plain-language summary of how Fix-It Registry handles personal data. It is a template and not legal advice — have a solicitor review it before you rely on it in production.</p><h2>What we collect</h2><p>If you create an account we store your email address and the display name you choose. If you leave a review we store the review text, the rating, and which shop it is attached to, alongside your account id.</p><p>We do not collect payment details, because we never take a payment. Repairs are paid to the shop directly.</p><h2>What we do not do</h2><p>We do not sell personal data, and we do not pass your details to shops as sales leads. A shop learns who you are only if you contact them or leave a review under your display name.</p><h2>Cookies</h2><p>A session cookie keeps you signed in. There is no advertising or cross-site tracking cookie on this site.</p><h2>Deleting your account</h2><p>Ask, and we delete the account and every review attached to it. Removal is permanent and is not recoverable afterwards.</p><h2>Contact</h2><p>Privacy questions go to the address on the contact page, and we aim to answer within thirty days.</p>"}
    ]'::jsonb,
    'Privacy policy — Fix-It Registry',
    'What personal data Fix-It Registry collects, why we collect it, how long we keep it, and how to have your account and reviews deleted.',
    array['privacy policy','data protection'],
    'WebPage', false, true
  ),
  (
    'Terms of Use', 'terms', '', 'published',
    '[
      {"type":"compact_hero","eyebrow":"Legal","heading":"Terms of use","subtitle":"The rules for using the directory, in about four hundred words."},
      {"type":"rich_text","width":"prose","html":"<p>A template, not legal advice. Have it reviewed before launch.</p><h2>What this service is</h2><p>Fix-It Registry is a directory. We list repair businesses; we do not perform repairs, employ the people who do, or act as a party to any agreement you reach with them. Any dispute over a repair is between you and the shop.</p><h2>Listings</h2><p>Shops supply their own details. We verify address and phone for listings that carry the verified badge, but we do not audit workmanship, pricing or insurance, and a listing is not a recommendation.</p><h2>Reviews</h2><p>Leave reviews of repairs you actually had done. We remove content that is defamatory, discriminatory, or written to damage a competitor, and we remove reviews from accounts we believe to be operated by a shop or by anyone connected to one.</p><h2>Accounts</h2><p>You are responsible for what happens under your account. Tell us if you think someone else has access to it.</p><h2>Liability</h2><p>The directory is provided as-is. We are not liable for the quality, timeliness or outcome of any repair arranged through it.</p>"}
    ]'::jsonb,
    'Terms of use — Fix-It Registry',
    'The terms that govern use of the Fix-It Registry directory: what the service is, how listings and reviews work, and where liability sits.',
    array['terms of use','terms and conditions'],
    'WebPage', false, true
  ),
  (
    'List Your Repair Shop', 'join', '', 'published',
    '[
      {"type":"compact_hero","eyebrow":"For repair shops","heading":"List your shop","subtitle":"Free, permanently. We do not sell leads and we do not take a percentage of your work.","ctas":[{"label":"See how verification works","href":"/verification"}]},
      {"type":"rich_text","width":"prose","html":"<p>If you repair things for a living and you have a fixed address or a mobile service area, you can be listed. There is no fee, no tier, and no paid placement — ranking is by rating, review count and verification status.</p><h2>What a listing gives you</h2><p>A profile page with your own phone number and address on it, a live opening-hours readout in your timezone rather than a static table, photos of your bench, and the service models you actually offer: in-shop, home visit, or pickup and drop.</p><h2>What we ask</h2><p>Keep your hours accurate. The single most common complaint about directories is arriving at a shop that is shut, and a live readout is only better than a stale table if the underlying data is right.</p>"},
      {"type":"faq_accordion","title":"Common questions","items":[
        {"question":"How much does it cost?","answer":"Nothing. There is no listing fee, no lead fee, and no commission on the repairs you take."},
        {"question":"How do I get the verified badge?","answer":"We confirm the business exists at the address given and that the phone number reaches it. The verification page explains the process in full."},
        {"question":"Can I remove a review I disagree with?","answer":"No, and neither can we on request. We remove reviews that break the rules — defamatory content, competitor sabotage, reviews of repairs that never happened — but not reviews that are simply unflattering."},
        {"question":"Can I reply to reviews?","answer":"Not yet. It is the most requested feature and it is on the roadmap."}
      ]},
      {"type":"cta_banner","heading":"Ready to be listed?","body":"Create an account, then send us your shop details and we will set the profile up.","cta":{"label":"Create an account","href":"/signup"}}
    ]'::jsonb,
    'List your repair shop — free, no commission | Fix-It Registry',
    'List your repair business on Fix-It Registry for free. No listing fees, no lead fees, no commission. Live opening hours and your own phone number on every profile.',
    array['list repair shop','add my business','repair shop directory listing'],
    'WebPage', true, true
  ),
  (
    'How Verification Works', 'verification', '', 'published',
    '[
      {"type":"compact_hero","eyebrow":"For repair shops","heading":"How verification works","subtitle":"What the badge checks, what it deliberately does not, and how to get one."},
      {"type":"rich_text","width":"prose","html":"<p>A verified badge on a listing means two specific things have been confirmed: the business exists at the address shown, and the phone number on the profile reaches it.</p><h2>What we check</h2><p>We call the number on the listing and confirm it is answered by the business. We confirm the address resolves to a real premises, or in the case of a mobile service, that the stated coverage area matches where the business actually operates.</p><h2>What the badge does not mean</h2><p>It is not a quality rating, an insurance check, or a guarantee of workmanship. Those are different claims and we do not make them. Quality is what the review score is for, and it is worth reading the reviews rather than the badge.</p><h2>Keeping it</h2><p>A badge lapses if the phone number stops working or the address changes without the listing being updated. We re-check periodically, and a listing whose details have gone stale loses the badge until they are corrected.</p>"},
      {"type":"highlights_strip","items":[{"value":"2","label":"checks: address and phone"},{"value":"Free","label":"to be verified"},{"value":"0","label":"quality claims implied"}]}
    ]'::jsonb,
    'How shop verification works — Fix-It Registry',
    'What the verified badge on a Fix-It Registry listing actually confirms: address and phone number. What it does not claim, and how a shop keeps it.',
    array['verified repair shop','shop verification'],
    'WebPage', true, true
  )
on conflict (lower(path_prefix), lower(slug)) do update
  set title            = excluded.title,
      status           = excluded.status,
      content_sections = excluded.content_sections,
      meta_title       = excluded.meta_title,
      meta_description = excluded.meta_description,
      keywords         = excluded.keywords,
      schema_type      = excluded.schema_type,
      is_indexed       = excluded.is_indexed,
      is_followed      = excluded.is_followed;

-- ─── Sample Job Vacancies ───────────────────────────────────────────────────

insert into shop_jobs (
  fixer_id, title, job_type, work_location, experience_level,
  salary_type, salary_min, salary_max, salary_period, salary_negotiable,
  description, skills_required, contact_phone, contact_whatsapp, is_active
)
select
  f.id, j.title, j.job_type::job_type, j.work_location::work_location, j.experience_level,
  j.salary_type::salary_type, j.salary_min, j.salary_max, j.salary_period::salary_period, j.salary_negotiable,
  j.description, j.skills_required, j.contact_phone, j.contact_whatsapp, true
from (values
  (
    'northgate-phone-clinic',
    'Smartphone & Micro-Soldering Technician',
    'full_time',
    'in_shop',
    '1-2 Years Experience',
    'range',
    25000,
    35000,
    'month',
    true,
    'Looking for a skilled technician for iPhone & Android screen replacements, charging port repairs, and SMD chip soldering. Clean workbench provided.',
    array['Screen Replacement', 'SMD Soldering', 'Charging Port Repair', 'Battery Replacement'],
    '+91 98765 43210',
    '+91 98765 43210'
  ),
  (
    'brightwell-laptop-works',
    'Laptop Chip-Level Hardware Specialist',
    'full_time',
    'in_shop',
    '2+ Years Experience',
    'range',
    30000,
    45000,
    'month',
    true,
    'Urgent opening for a motherboard repair specialist. Must have experience with BGA rework stations, thermal diagnostics, and schematic tracing.',
    array['BGA Rework', 'Motherboard Schematics', 'Power Rail Diagnostics', 'BIOS Programming'],
    '+91 98111 22334',
    '+91 98111 22334'
  ),
  (
    'halloway-appliance-service',
    'Appliance Repair Apprentice / Trainee',
    'apprenticeship',
    'on_field',
    'Fresher / Eager to Learn',
    'range',
    12000,
    18000,
    'month',
    true,
    'Hands-on training provided for washing machine, microwave, and refrigerator repairs. Valid 2-wheeler license required for field visits with senior technician.',
    array['Basic Electrical Wiring', 'Multimeter Use', 'Appliance Assembly', 'Customer Service'],
    '+91 98222 33445',
    '+91 98222 33445'
  )
) as j (
  fixer_slug, title, job_type, work_location, experience_level,
  salary_type, salary_min, salary_max, salary_period, salary_negotiable,
  description, skills_required, contact_phone, contact_whatsapp
)
join fixer_profiles f on lower(f.slug) = j.fixer_slug;

