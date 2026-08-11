-- ============================================================
-- Migration: Seed Privacy Policy, Terms of Service, About pages
-- Safe to re-run — skips any page that already exists by slug.
-- ============================================================

-- ── Privacy Policy ─────────────────────────────────────────────────────────
INSERT INTO seo_pages (
  slug, path_prefix, title, status, is_indexed, is_followed,
  schema_type, meta_title, meta_description, keywords, published_at, content_sections
)
SELECT
  'privacy', '', 'Privacy Policy', 'published', true, true,
  'WebPage',
  'Privacy Policy — FixGrid',
  'Learn how FixGrid collects, uses and protects your personal data when you use our local repair directory.',
  ARRAY['privacy policy','data protection','personal data','FixGrid'],
  now(),
  '[
    {
      "type": "compact_hero",
      "eyebrow": "Legal",
      "heading": "Privacy Policy",
      "subtitle": "Last updated: August 2026. This policy explains what data FixGrid collects, why we collect it, and how you can control it."
    },
    {
      "type": "rich_text",
      "width": "prose",
      "html": "<h2>1. Who we are</h2><p>FixGrid (\"we\", \"our\", \"us\") operates the website at <strong>vytron.me</strong> — a directory of local repair shops and independent fixers. Our registered email for data enquiries is: <strong>hello@vytron.me</strong>.</p><h2>2. What data we collect</h2><h3>Data you give us</h3><ul><li><strong>Account registration</strong> — email address and password (hashed, never stored in plain text) when you create a customer or expert account.</li><li><strong>Expert profile</strong> — shop name, address, phone number, opening hours, service description and any photos you upload.</li><li><strong>Job requests</strong> — description of the repair you need, contact details you choose to share, and any files you attach.</li></ul><h3>Data collected automatically</h3><ul><li><strong>Server logs</strong> — IP address, browser type, pages visited and timestamps. Retained for 30 days for security purposes.</li><li><strong>Cookies</strong> — a single session cookie issued by Supabase Auth to keep you signed in. No third-party advertising cookies are set.</li></ul><h2>3. How we use your data</h2><ul><li>To create and manage your account.</li><li>To display your shop profile to potential customers (experts only).</li><li>To match customers with relevant local repair shops.</li><li>To send transactional emails (booking confirmations, password resets). We do not send marketing email without your explicit consent.</li><li>To investigate abuse reports and enforce our Terms of Service.</li></ul><h2>4. Legal basis (UK/EU GDPR)</h2><p>We process your data on the following bases: <strong>contract performance</strong> (running your account), <strong>legitimate interests</strong> (preventing fraud, improving the directory), and <strong>consent</strong> (optional marketing communications).</p><h2>5. Data sharing</h2><p>We do not sell your personal data. We share it only:</p><ul><li>With <strong>Supabase</strong> (database and authentication infrastructure, hosted in the EU).</li><li>With <strong>Vercel</strong> (web hosting, servers in the EU/US under Standard Contractual Clauses).</li><li>When required by law or a court order.</li></ul><h2>6. Data retention</h2><p>Account data is kept for as long as your account is active. You may request deletion at any time — we will erase all personal data within 30 days, subject to any legal retention obligations.</p><h2>7. Your rights</h2><p>Under UK/EU GDPR you have the right to: access, correct, port, restrict processing of, or erase your personal data. To exercise any right, email <strong>hello@vytron.me</strong>. You also have the right to lodge a complaint with the Information Commissioner''s Office (ICO) in the UK or your national supervisory authority.</p><h2>8. Security</h2><p>All data is transmitted over HTTPS. Passwords are hashed using bcrypt. We conduct periodic security reviews and apply software updates promptly.</p><h2>9. Changes to this policy</h2><p>We will update this page when our practices change and note the revision date at the top. Continued use of FixGrid after a change constitutes acceptance of the updated policy.</p><h2>10. Contact</h2><p>Questions about this policy? Email us at <strong>hello@vytron.me</strong>.</p>"
    }
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM seo_pages WHERE slug = 'privacy' AND path_prefix = ''
);

-- ── Terms of Service ───────────────────────────────────────────────────────
INSERT INTO seo_pages (
  slug, path_prefix, title, status, is_indexed, is_followed,
  schema_type, meta_title, meta_description, keywords, published_at, content_sections
)
SELECT
  'terms', '', 'Terms of Service', 'published', true, true,
  'WebPage',
  'Terms of Service — FixGrid',
  'Read the terms and conditions that govern your use of FixGrid, the local repair directory.',
  ARRAY['terms of service','terms and conditions','FixGrid','legal'],
  now(),
  '[
    {
      "type": "compact_hero",
      "eyebrow": "Legal",
      "heading": "Terms of Service",
      "subtitle": "Last updated: August 2026. By using FixGrid you agree to these terms. Please read them carefully."
    },
    {
      "type": "rich_text",
      "width": "prose",
      "html": "<h2>1. About FixGrid</h2><p>FixGrid is an online directory that connects consumers with local repair businesses and independent repair professionals (\"Experts\"). FixGrid does not itself carry out repairs, act as an agent for any Expert, or guarantee the quality or outcome of any repair.</p><h2>2. Acceptance of terms</h2><p>By accessing or using FixGrid you confirm that you are at least 18 years old and that you agree to be bound by these Terms. If you use FixGrid on behalf of a business, you confirm you have authority to bind that business.</p><h2>3. Expert listings</h2><p>Experts are solely responsible for the accuracy of their profile information, including their address, opening hours, pricing and the services they offer. FixGrid reserves the right to remove or suspend any listing that contains false, misleading or inappropriate content.</p><h2>4. Customer conduct</h2><p>Customers must not: submit false job requests; harass, abuse or threaten Experts; post reviews they know to be inaccurate; or use FixGrid for any unlawful purpose.</p><h2>5. No platform fee or booking guarantee</h2><p>FixGrid earns no commission on repairs arranged through the directory. All commercial agreements — price, warranty, payment terms — are made directly between the customer and the Expert. FixGrid is not a party to those agreements and accepts no liability for their outcome.</p><h2>6. Reviews</h2><p>Reviews submitted through FixGrid must reflect a genuine first-hand experience. Fabricated, incentivised or malicious reviews may be removed. FixGrid reserves the right to investigate complaints and take action against accounts that abuse the review system.</p><h2>7. Intellectual property</h2><p>The FixGrid name, logo and site design are our intellectual property. Expert-uploaded photos remain the property of the Expert; by uploading them you grant FixGrid a non-exclusive, royalty-free licence to display them on the directory.</p><h2>8. Limitation of liability</h2><p>To the maximum extent permitted by law, FixGrid is not liable for: the quality or safety of any repair; any loss arising from reliance on directory information; or any indirect, incidental or consequential damages. Our total liability to you will not exceed £100.</p><h2>9. Indemnity</h2><p>You agree to indemnify FixGrid against any claims arising from your use of the platform in breach of these Terms.</p><h2>10. Termination</h2><p>We may suspend or terminate your account at any time if we reasonably believe you have breached these Terms. You may close your account at any time by emailing <strong>hello@vytron.me</strong>.</p><h2>11. Governing law</h2><p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p><h2>12. Changes to these terms</h2><p>We may update these Terms at any time. The revision date at the top of this page records when they last changed. Continued use after an update constitutes acceptance.</p><h2>13. Contact</h2><p>Questions about these Terms? Email <strong>hello@vytron.me</strong>.</p>"
    }
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM seo_pages WHERE slug = 'terms' AND path_prefix = ''
);

-- ── About ──────────────────────────────────────────────────────────────────
INSERT INTO seo_pages (
  slug, path_prefix, title, status, is_indexed, is_followed,
  schema_type, meta_title, meta_description, keywords, published_at, content_sections
)
SELECT
  'about', '', 'About FixGrid', 'published', true, true,
  'WebPage',
  'About FixGrid — The local repair directory',
  'FixGrid is a directory of verified local repair shops covering phones, appliances, bikes, watches and more. Find someone who can actually fix it.',
  ARRAY['about FixGrid','local repair directory','repair economy','verified repair shops'],
  now(),
  '[
    {
      "type": "compact_hero",
      "eyebrow": "About us",
      "heading": "We built a directory for the repair economy",
      "subtitle": "FixGrid exists because finding a good local repairer should not be harder than buying a replacement.",
      "ctas": [
        { "label": "Browse the directory", "href": "/search", "variant": "primary" },
        { "label": "List your shop", "href": "/join", "variant": "outline" }
      ]
    },
    {
      "type": "rich_text",
      "width": "prose",
      "html": "<h2>Why FixGrid?</h2><p>Every year, millions of phones, appliances, bikes and garments are discarded because their owners could not find a repairer quickly enough — or did not trust that the one they found was any good. FixGrid is our answer to that problem: a clean, honest directory of real repair businesses with live opening hours, verified contact details and genuine customer ratings.</p><p>We do not take commission. We do not sit between the customer and the shop. We just make it easy to find someone nearby who knows how to fix the thing you own.</p><h2>What makes a listing trustworthy?</h2><p>Every shop on FixGrid fills in their own profile — hours, services, address, specialisms. Listings marked <strong>Verified</strong> have had their address and phone number confirmed by the FixGrid team. Ratings come from customers who used the service, and we investigate any report of a fabricated review.</p><h2>Who is behind FixGrid?</h2><p>FixGrid is an independent product. We are not affiliated with any repair chain, manufacturer or insurance company. Our only financial relationship is with the shops that choose to take a paid featured placement — and even that does not affect their star rating or search ranking.</p><h2>The repair economy matters</h2><p>A repaired device is one that does not go to landfill. A repair job is local employment. A repair shop is a neighbourhood business that pays local rates and employs local people. FixGrid is built on the belief that repair is worth making easy.</p><h2>Get in touch</h2><p>We read every email sent to <strong>hello@vytron.me</strong>. If you run a repair shop and want to be listed, use the <a href=\"/join\">join page</a>. If you have found an inaccuracy, spotted a problem or have a feature idea, just email us.</p>"
    },
    {
      "type": "feature_grid",
      "title": "What the directory covers",
      "columns": 3,
      "items": [
        { "title": "Phone and tablet repair", "body": "Screen replacements, batteries, charging ports, water damage and board-level faults." },
        { "title": "Appliance repair", "body": "Washing machines, fridges, ovens, dishwashers and small kitchen appliances." },
        { "title": "Bicycle repair", "body": "Punctures, drivetrain servicing, brake adjustment, wheel truing and e-bike electrics." },
        { "title": "Watch and clock repair", "body": "Battery changes, seal testing, crystal replacement, strap fitting and mechanical movement servicing." },
        { "title": "Laptop and computer repair", "body": "Keyboard replacements, hinge repairs, thermal work, storage upgrades and data recovery." },
        { "title": "Clothing and leather repair", "body": "Alterations, zip replacements, patch work, shoe resoling and leather restoration." }
      ]
    },
    {
      "type": "cta_banner",
      "heading": "Run a repair business?",
      "body": "Add your shop to the directory for free. No commission, no subscription — just more customers finding you.",
      "cta": { "label": "List your shop", "href": "/join", "variant": "primary" }
    }
  ]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM seo_pages WHERE slug = 'about' AND path_prefix = ''
);
