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
-- Curated profiles across all major categories, calibrated for Indian metro markets
-- (Delhi NCR, Bengaluru, Mumbai, Pune, Hyderabad), verified badges, varied hours,
-- and platform-guaranteed escrow warranties (30, 60, 90 days).

insert into fixer_profiles (
  slug, shop_name, bio, address, lat, lng, timezone, verified, photos,
  offers_in_shop, offers_home_service, offers_pickup_drop,
  working_days, opening_time, closing_time, hours,
  contact_phone, contact_email, is_hidden,
  default_warranty_days, rating_avg, rating_count
) values
  (
    'acousticwave-hifi-engineering', 'AcousticWave Hi-Fi & Sound Engineering',
    E'Vintage and modern audio electronics restoration. We repair tube amplifiers, AV receivers, studio monitors, DACs, and speaker crossovers from Marantz, Denon, Marshall, and Harman Kardon.\n\nServices cover transistor biasing, potentiometer deoxidizing, capacitor recapping, and audio distortion tracing with audio spectrum analyzers.',
    '12 Perry Cross Road, Bandra West, Mumbai, Maharashtra 400050', 19.0596, 72.8295, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&q=80', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00:00', '19:00:00',
    '{"sat":{"open":"11:00","close":"16:00"},"sun":null}'::jsonb,
    '+91 98205 12345', 'sound@acousticwave.example', false,
    60, 4.8, 24
  ),
  (
    'aerofix-drone-aerial-works', 'AeroFix Drone & Aerial Camera Workshop',
    E'Certified aerial camera and multirotor drone service station. We stock brushless motors, carbon fiber arms, ESC power distribution boards, and optical landing sensors.\n\nFirmware recalibrations, IMU calibration, and pre-delivery flight testing inside an enclosed safety cage.',
    'Baner Road, Baner, Pune, Maharashtra 411045', 18.559, 73.7868, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '09:30:00', '18:30:00',
    '{"sun":null}'::jsonb,
    '+91 98220 55443', 'hangar@aerofixdrones.example', false,
    60, 4.8, 21
  ),
  (
    'apex-microsoldering-lab', 'Apex Micro-Soldering & Smartphone Lab',
    E'Certified SMD and micro-soldering laboratory specializing in complex logic board diagnostics, iPhone and Android screen laminations, and component-level repairs.\n\nEquipped with stereo microscopes, hot air rework stations, and precision thermal imagers. We stock OEM-spec AMOLED panels, original battery cells, and high-frequency charging ports.\n\nEvery repair includes free pre-diagnostic inspection and is protected by FixGrid''s 90-day escrow warranty.',
    'Shop 14, Ground Floor, Nehru Place Market, New Delhi, Delhi 110019', 28.5494, 77.2536, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&q=80', 'https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00:00', '20:00:00',
    '{"sat":{"open":"10:30","close":"19:00"},"sun":null}'::jsonb,
    '+91 98101 23456', 'service@apexmicrosolder.example', false,
    90, 4.9, 52
  ),
  (
    'byteforge-workstation-rigs', 'ByteForge Custom PC & Workstation Rigs',
    E'High-performance desktop PCs, gaming rigs, and enterprise workstation builders. We troubleshoot blue screens (BSOD), overheating, GPU artifacting, and dead power supplies.\n\nCustom liquid cooling loop maintenance, thermal pad replacement, cable management, BIOS flashing, and memory stability tuning with synthetic benchmarking.',
    'Shop 18, SP Road, Bengaluru, Karnataka 560002', 12.9654, 77.5835, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:30:00', '20:00:00',
    '{"sun":null}'::jsonb,
    '+91 98459 11990', 'rigs@byteforge.example', false,
    60, 4.9, 42
  ),
  (
    'circuitsurgeon-pcb-motherboards', 'CircuitSurgeon Inverter & Motherboard Care',
    E'Component-level electronic board repair for inverter ACs, refrigerator PCBs, smart TVs, and washing machine digital controllers.\n\nOscilloscope signal tracing, PWM controller replacement, IGBT transistor swapping, and conformal coating to protect against moisture and short circuits.',
    'Okhla Phase 2, Industrial Area, New Delhi, Delhi 110020', 28.5284, 77.2796, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri,sat}', '09:00:00', '18:30:00',
    '{"sun":null}'::jsonb,
    '+91 98113 44556', 'boards@circuitsurgeon.example', false,
    90, 4.8, 31
  ),
  (
    'cobbler-co-shoe-spa', 'Cobbler & Co. Heritage Shoe Spa & Repair',
    E'Footwear reconditioning, resoling, and leather shoe spa. We replace worn Vibram outsoles, heel blocks, inner linings, and broken eyelets on formal leather shoes, boots, and luxury sneakers.\n\nFull deep-steam sanitization, stain removal, leather conditioning, and waterproof sealing on all pairs.',
    '14th Road, Khar West, Mumbai, Maharashtra 400052', 19.0688, 72.8364, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00:00', '20:00:00',
    '{"sun":null}'::jsonb,
    '+91 98201 99887', 'spa@cobblerco.example', false,
    30, 4.7, 38
  ),
  (
    'coolbreeze-fridge-hvac-experts', 'CoolBreeze Refrigerator & Cooling Experts',
    E'Specialized refrigeration and cooling appliance repair. We fix side-by-side frost-free refrigerators, inverter compressors, defrost thermostats, and gas leakage.\n\nEquipped with nitrogen pressure testing kits and recovery machines to service R600a and R134a refrigerants safely.',
    'Sushant Lok Phase 1, Sector 43, Gurugram, Haryana 122002', 28.4595, 77.0725, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=1200&q=80'],
    false, true, false,
    '{mon,tue,wed,thu,fri,sat,sun}', '08:00:00', '20:00:00',
    '{"sun":{"open":"09:00","close":"17:00"}}'::jsonb,
    '+91 98109 44332', 'hvac@coolbreezeexperts.example', false,
    90, 4.8, 44
  ),
  (
    'crown-time-horology-atelier', 'Crown & Time Horology Atelier',
    E'Master horologists servicing luxury Swiss timepieces, vintage automatic movements, and precision quartz chronographs. We handle full movement teardown, ultrasonic cleaning, escapement regulation, and gasket pressure sealing.\n\nEquipped with Witschi timing machines and pressure testing chambers tested up to 20 ATM. We also service heirloom leather straps and deployant clasps.',
    'Shop 7, Heritage Arcade, Fort, Mumbai, Maharashtra 400001', 18.9322, 77.8335, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1200&q=80', 'https://images.unsplash.com/photo-1495856458515-0637185db551?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:30:00', '18:30:00',
    '{"sat":{"open":"11:00","close":"17:00"},"sun":null}'::jsonb,
    '+91 98200 44556', 'atelier@crowntime.example', false,
    90, 4.9, 48
  ),
  (
    'crystalview-display-hospital', 'CrystalView LED & OLED Display Hospital',
    E'Specialized display and television repair facility. We fix 4K/8K OLED and QLED panels, backlight LED array strips, T-Con timing boards, and power supply units.\n\nBonding machine on-site for COF (Chip-On-Film) tab bonding to resolve vertical lines and flickering displays without costly complete panel replacement.',
    'Atta Market, Sector 18, Noida, Uttar Pradesh 201301', 28.5708, 77.3261, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri,sat,sun}', '10:00:00', '20:30:00',
    '{"sun":{"open":"11:00","close":"18:00"}}'::jsonb,
    '+91 98117 22334', 'displays@crystalview.example', false,
    90, 4.8, 39
  ),
  (
    'gamerzone-console-clinic', 'GamerZone Console Clinic & HDMI Pros',
    E'Hyderabad''s gaming console specialists: HDMI port micro-soldering, internal power supply repairs, disc laser replacement, and thermal cooling overhauls for PS4, PS5, and Xbox.\n\nSame-day port repairs with microscopes and heavy-duty reinforced solder joints.',
    'Near Image Hospital, Madhapur, Hyderabad, Telangana 500081', 17.4483, 78.3915, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:30:00', '20:00:00',
    '{"sun":null}'::jsonb,
    '+91 98490 22334', 'gaming@gamerzoneclinic.example', false,
    60, 4.7, 32
  ),
  (
    'heavyduty-power-tools-works', 'HeavyDuty Power Tool & Motor Works',
    E'Industrial workshop and contractor tool repair. We rebuild angle grinders, rotary hammer drills, circular saws, air compressors, and welding machines from Bosch, Makita, Dewalt, and Stanley.\n\nArmature rewinding, carbon brush renewal, chuck realignment, and bearing replacements performed with high-grade industrial components.',
    'Plot 18, Sector 6 Industrial Area, Faridabad, Haryana 121006', 28.4089, 77.3178, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '08:30:00', '19:00:00',
    '{"sun":null}'::jsonb,
    '+91 98115 88990', 'tools@heavydutyworks.example', false,
    30, 4.7, 27
  ),
  (
    'icare-precision-apple-hub', 'iCare Precision Tablet & Apple Care Hub',
    E'Precision iPad, iPhone, and Apple Watch repair center. We specialize in iPad digitizer lamination, swollen battery extraction, bent aluminum housing straightening, and FaceID flex repairs.\n\nClean room environment prevents dust inclusion between display layers. Fast turnarounds with guaranteed 90-day FixGrid escrow protection.',
    'Lokhandwala Complex, Andheri West, Mumbai, Maharashtra 400053', 19.1363, 72.8277, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat,sun}', '10:00:00', '20:30:00',
    '{"sun":{"open":"11:00","close":"18:00"}}'::jsonb,
    '+91 98203 77889', 'care@icareapplehub.example', false,
    90, 4.9, 57
  ),
  (
    'kestrel-watch-restoration-studio', 'Kestrel Watch Restoration Studio',
    E'Bengaluru''s horological bench specializing in vintage mechanical wristwatches, pocket watches, and mantle clocks. Full ultrasonic strip-down, pivot polishing, and balance spring truing.\n\nPre- and post-repair timing graph reports provided with every complete service.',
    'Prestige Meridian, MG Road, Bengaluru, Karnataka 560001', 12.9756, 77.6094, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00:00', '18:00:00',
    '{"sat":{"open":"10:30","close":"15:00"},"sun":null}'::jsonb,
    '+91 98458 22110', 'studio@kestrelwatch.example', false,
    90, 4.8, 32
  ),
  (
    'keymaster-mechanical-keyboards', 'KeyMaster Custom Keyboard & Switch Lab',
    E'Enthusiast mechanical keyboard servicing, switch lubing (Krytox 205g0), stabilizer tuning, PCB trace repairing, and custom USB-C port soldering.\n\nWe fix chatter, unresponsive keys, broken hot-swap sockets, and liquid spilled boards for gaming and productivity keyboards.',
    '5th Block, Koramangala, Bengaluru, Karnataka 560095', 12.9352, 77.6245, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '11:00:00', '19:00:00',
    '{"sun":null}'::jsonb,
    '+91 98453 88776', 'switches@keymasterlab.example', false,
    60, 4.9, 28
  ),
  (
    'kitchenpro-small-appliances', 'KitchenPro Small Appliance Hub',
    E'Quick-turnaround repair for kitchen and dining appliances: espresso and bean-to-cup coffee machines, air fryers, food processors, induction cooktops, and high-speed blenders.\n\nDescaling, heating element replacement, motor coupling overhaul, and PCB repair with genuine manufacturer spare parts.',
    'Pocket 2, Sector 8, Rohini, New Delhi, Delhi 110085', 28.7159, 77.1126, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri,sat}', '09:30:00', '19:30:00',
    '{"sun":null}'::jsonb,
    '+91 98108 99001', 'service@kitchenpro.example', false,
    30, 4.6, 23
  ),
  (
    'mastercraft-leather-restorations', 'MasterCraft Leather & Bag Restorations',
    E'Artisanal leather restoration and luxury handbag repair. We restore designer bags, briefcases, leather jackets, and luggage from Louis Vuitton, Gucci, Prada, and Coach.\n\nServices include edge paint restoration, zipper and slider replacement, deep cleaning, colour touch-up, and hardware replating.',
    'Shop 12A, Middle Lane, Khan Market, New Delhi, Delhi 110003', 28.6003, 77.2273, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:30:00', '19:30:00',
    '{"sun":null}'::jsonb,
    '+91 98114 11223', 'care@mastercraftleather.example', false,
    60, 4.9, 45
  ),
  (
    'metroscreen-express-phone-fix', 'MetroScreen Express Phone & Display Fix',
    E'Fast, reliable express smartphone repairs in the heart of Delhi. Cracked screen glass laminations, original battery replacements, ear speaker cleaning, and water splash treatment.\n\n30-minute turnarounds on common iPhone and Samsung screen swaps while you wait. Covered under FixGrid 90-day escrow warranty.',
    'Block M, Middle Circle, Connaught Place, New Delhi, Delhi 110001', 28.6315, 77.2167, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00:00', '20:00:00',
    '{"sun":null}'::jsonb,
    '+91 98102 66778', 'express@metroscreen.example', false,
    90, 4.8, 63
  ),
  (
    'nextgen-console-diagnostics', 'NextGen Console & Gaming Diagnostics',
    E'Dedicated gaming hardware center handling PlayStation 5, Xbox Series X, and Nintendo Switch consoles. Specialized in replacing fractured HDMI 2.1 ports, liquid metal thermal repastes, APU power rail faults, and disc drive laser pickups.\n\nWe also modify and repair custom mechanical keyboards, hot-swap PCB sockets, and Hall effect analogue sticks.',
    'Plot 52, Gaffar Market, Karol Bagh, New Delhi, Delhi 110005', 28.6514, 77.1907, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&q=80', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '11:00:00', '20:30:00',
    '{"sun":null}'::jsonb,
    '+91 98118 77665', 'repairs@nextgenconsole.example', false,
    60, 4.8, 37
  ),
  (
    'optix-zoom-lens-workshop', 'Optix & Zoom Precision Lens Workshop',
    E'Dedicated optical lens and camera body servicing lab. We fix zoom barrel jamming, fungus on internal elements, aperture blade sticking, and electronic contacts oxidation.\n\nLaser collimation and MTF resolution testing ensure factory-grade optical sharpness after reassembly.',
    'Flora Fountain, Fort, Mumbai, Maharashtra 400001', 18.9322, 72.8335, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00:00', '18:30:00',
    '{"sat":{"open":"10:30","close":"16:00"},"sun":null}'::jsonb,
    '+91 98204 88776', 'lens@optixzoom.example', false,
    90, 4.9, 36
  ),
  (
    'pedalpower-performance-cycles', 'PedalPower Performance Cycles & E-Drives',
    E'South Delhi''s road, MTB, and e-bike workshop. Carbon frame ultrasound crack inspection, tubeless tire conversions, internal cable routing, and electronic gear shifting (Di2/AXS) pairing.\n\nWalk-ins welcome for quick punctures, brake pad replacements, and chain lubrication.',
    'Pocket 1, Sector B, Vasant Kunj, New Delhi, Delhi 110070', 28.5244, 77.1558, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=1200&q=80'],
    true, true, false,
    '{tue,wed,thu,fri,sat,sun}', '08:30:00', '19:00:00',
    '{"mon":null,"sun":{"open":"08:30","close":"14:00"}}'::jsonb,
    '+91 98110 88776', 'support@pedalpowercycles.example', false,
    30, 4.9, 34
  ),
  (
    'prism-shutter-camera-clinic', 'Prism & Shutter Camera Clinic',
    E'Specialized optical and digital camera service clinic. We repair mirrorless cameras, digital SLRs, cine lenses, and autofocus motors from Sony, Canon, Nikon, and Fujifilm.\n\nWe provide certified ISO Class 5 clean-bench sensor cleaning, optical collimation, shutter curtain assembly replacement, and electronic stabilization repairs.',
    'Shop 21, Kucha Choudhary Camera Market, Chandni Chowk, Delhi 110006', 28.6562, 77.231, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00:00', '19:00:00',
    '{"sun":null}'::jsonb,
    '+91 98119 55443', 'optics@prismshutter.example', false,
    60, 4.9, 31
  ),
  (
    'royal-chrono-swiss-service', 'Royal Chrono & Swiss Timepiece Service',
    E'Vintage and modern luxury watch restoration atelier. We service Rolex, Omega, Tag Heuer, Seiko, and Tissot timepieces.\n\nDemagnetizing, water-resistance gasket renewal, sapphire crystal scratch buffing, and high-frequency escapement synchronization.',
    'Inner Circle, Connaught Place, New Delhi, Delhi 110001', 28.6328, 77.2197, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '10:30:00', '19:00:00',
    '{"sun":null}'::jsonb,
    '+91 98103 55667', 'horology@royalchrono.example', false,
    90, 4.9, 51
  ),
  (
    'silicon-bay-macbook-works', 'Silicon Bay MacBook & Laptop Works',
    E'Bengaluru''s premier workstation and ultrabook recovery bench. We fix what authorized centers call ''unfixable'' — liquid spill board oxidation, blown capacitors, keyboard matrix faults, and Apple Retina display flex repairs.\n\nWe provide NAND storage upgrades for selected models, GPU reballing, and clean hinge rebuilding. Data integrity is guaranteed: customer drives remain untouched or cloned before teardown.',
    '412, 100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038', 12.9716, 77.6412, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&q=80', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri,sat}', '09:30:00', '19:30:00',
    '{"sat":{"open":"10:00","close":"18:00"},"sun":null}'::jsonb,
    '+91 98450 98765', 'support@siliconbaymac.example', false,
    60, 4.8, 41
  ),
  (
    'skyward-drone-dynamics', 'Skyward Drone Dynamics & Robotics Lab',
    E'Unmanned aerial vehicle (UAV) repair and calibration center. We fix DJI, Autel, and custom FPV drones suffering from crash damage, gimbal roll errors, burned ESCs, and compass desync.\n\nEquipped with dynamic motor balancing rigs, optical flow sensor alignment jigs, and antenna RF diagnostic analyzers. Every flight repair includes ground tests and compass re-calibration.',
    'Tower B, Electronic City Phase 1, Bengaluru, Karnataka 560100', 12.8452, 77.6602, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=1200&q=80', 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1200&q=80'],
    true, false, true,
    '{mon,tue,wed,thu,fri}', '09:00:00', '18:30:00',
    '{"sat":{"open":"10:00","close":"15:00"},"sun":null}'::jsonb,
    '+91 98452 77889', 'hangar@skywarddrone.example', false,
    60, 4.7, 19
  ),
  (
    'threadcrafters-garment-restoration', 'ThreadCrafters Garment Restoration & Alterations',
    E'Bespoke tailoring, zipper replacements, seam reconstruction, and fine garment restoration. We repair wool suits, down jackets, designer dresses, and vintage denim.\n\nInvisible mending, tear reweaving, lining replacement, and custom resizing by master tailors with decades of sartorial craftsmanship.',
    '56 Commercial Street, Tasker Town, Bengaluru, Karnataka 560001', 12.9822, 77.6083, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri,sat}', '10:00:00', '19:30:00',
    '{"sun":null}'::jsonb,
    '+91 98455 33445', 'tailor@threadcrafters.example', false,
    30, 4.8, 26
  ),
  (
    'timbercraft-upholstery-sofa', 'TimberCraft Upholstery & Sofa Clinic',
    E'In-home furniture repair, reupholstery, and frame restoration. We renew saggy sofas, replace broken webbing and high-density foam, repair recliner cables, and fix wobbly dining chairs.\n\nWide fabric catalog brought to your home: stain-resistant velvets, breathable linens, and genuine leathers.',
    'ITPL Main Road, Whitefield, Bengaluru, Karnataka 560066', 12.9698, 77.7499, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80'],
    false, true, false,
    '{mon,tue,wed,thu,fri,sat}', '09:00:00', '19:00:00',
    '{"sun":{"open":"10:00","close":"15:00"}}'::jsonb,
    '+91 98457 44332', 'sofa@timbercraft.example', false,
    60, 4.7, 29
  ),
  (
    'urbanvolt-smarthome-iot', 'UrbanVolt Smart Home & IoT Automation',
    E'Smart home system technicians and electronic automation diagnostics. We troubleshoot smart locks, motorized curtains, Zigbee/Z-Wave hubs, solar inverter controllers, and Wi-Fi video doorbells.\n\nWe provide on-site electrical wiring isolation, firmware recovery, and surge protector restoration with clean cable dressing.',
    'Galleria Market, DLF Phase IV, Sector 28, Gurugram, Haryana 122009', 28.4735, 77.0864, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1558002038-1055907df827?w=1200&q=80'],
    false, true, false,
    '{mon,tue,wed,thu,fri,sat}', '09:00:00', '19:00:00',
    '{"sun":{"open":"10:00","close":"14:00"}}'::jsonb,
    '+91 98104 33221', 'connect@urbanvolt.example', false,
    60, 4.6, 22
  ),
  (
    'velocity-cycles-emobility', 'Velocity Cycle Works & E-Mobility Lab',
    E'High-precision bicycle workshop and electric micro-mobility diagnostic center. We service Shimano, SRAM, and Campagnolo drivetrains alongside Bafang and Bosch e-bike hub motors.\n\nServices include wheel truing, spoke tension balancing, hydraulic brake bleeding, bottom bracket overhauls, and lithium battery pack load-testing. Free 15-point safety check with every full tune-up.',
    '78, 27th Main Road, Sector 1, HSR Layout, Bengaluru, Karnataka 560102', 12.9121, 77.6446, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80', 'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&q=80'],
    true, false, true,
    '{tue,wed,thu,fri,sat,sun}', '09:00:00', '19:30:00',
    '{"mon":null,"sun":{"open":"09:00","close":"15:00"}}'::jsonb,
    '+91 98451 11223', 'pedal@velocitycycles.example', false,
    30, 4.9, 29
  ),
  (
    'voltcraft-appliance-solutions', 'VoltCraft Major Appliance Solutions',
    E'On-site master engineers for refrigerators, front-load washing machines, microwave inverters, and dishwashers. Equipped with computerized gas manifolds and digital multimeter diagnostics.\n\nOur service vans carry genuine replacement compressors, BLDC drain pumps, thermostats, and inverter PCB modules. Over 80% of faults are resolved on the first visit with upfront part pricing.',
    'A-28, Ring Road, Lajpat Nagar IV, New Delhi, Delhi 110024', 28.57, 77.24, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&q=80', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=1200&q=80'],
    true, true, false,
    '{mon,tue,wed,thu,fri,sat,sun}', '08:30:00', '20:00:00',
    '{"sun":{"open":"09:00","close":"16:00"}}'::jsonb,
    '+91 98112 34567', 'dispatch@voltcraftservice.example', false,
    90, 4.7, 36
  ),
  (
    'voltsmart-kitchen-care', 'VoltSmart Kitchen Equipment Care',
    E'Domestic and commercial kitchen appliance repair. Microwaves, blenders, OTGs, induction hobs, and electric kettles.\n\nHigh-voltage magnetron replacements, door interlock switch fixes, and thermal fuse renewals with safety insulation testing.',
    'SV Road, Goregaon West, Mumbai, Maharashtra 400062', 19.1663, 72.8526, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1585515320310-259814833e62?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri,sat}', '09:30:00', '19:30:00',
    '{"sun":null}'::jsonb,
    '+91 98207 33221', 'kitchen@voltsmartcare.example', false,
    30, 4.6, 25
  ),
  (
    'woodcraft-heirloom-furniture', 'WoodCraft & Heirloom Furniture Restorers',
    E'Wood furniture restoration, joint reinforcement, upholstery, and polish. We restore antique teakwood, rosewood, dining tables, recliner mechanisms, and ergonomic office chairs.\n\nFrench polish, polyurethane coating, foam rebuilding, spring renewal, and scratch filling performed on-site or in our carpentry workshop.',
    'Block 3, Kirti Nagar Industrial Area, New Delhi, Delhi 110015', 28.6508, 77.1394, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri,sat}', '09:30:00', '19:00:00',
    '{"sun":null}'::jsonb,
    '+91 98116 66554', 'wood@woodcraftrestorers.example', false,
    90, 4.8, 35
  ),
  (
    'zenith-micromobility-hub', 'Zenith Micro-Mobility & E-Riders Hub',
    E'Electric scooter, hoverboard, and e-bike engineering center. We repair Xiaomi, Ather, Ola, and generic e-scooter battery management systems (BMS), motor controllers, solid tire replacements, and disc brakes.\n\nSafety inspections, water intrusion drying, and throttle sensor calibrations performed on dedicated test benches.',
    'Lane 5, Koregaon Park, Pune, Maharashtra 411001', 18.5362, 73.894, 'Asia/Kolkata', true,
    array['https://images.unsplash.com/photo-1596516109370-29001ec8ec36?w=1200&q=80'],
    true, true, true,
    '{mon,tue,wed,thu,fri,sat}', '09:00:00', '19:00:00',
    '{"sat":{"open":"10:00","close":"17:00"},"sun":null}'::jsonb,
    '+91 98230 66778', 'rides@zenithmobility.example', false,
    60, 4.8, 33
  )
on conflict (lower(slug)) do update
  set shop_name             = excluded.shop_name,
      bio                   = excluded.bio,
      address               = excluded.address,
      lat                   = excluded.lat,
      lng                   = excluded.lng,
      timezone              = excluded.timezone,
      verified              = excluded.verified,
      photos                = excluded.photos,
      offers_in_shop        = excluded.offers_in_shop,
      offers_home_service   = excluded.offers_home_service,
      offers_pickup_drop    = excluded.offers_pickup_drop,
      working_days          = excluded.working_days,
      opening_time          = excluded.opening_time,
      closing_time          = excluded.closing_time,
      hours                 = excluded.hours,
      contact_phone         = excluded.contact_phone,
      contact_email         = excluded.contact_email,
      is_hidden             = excluded.is_hidden,
      default_warranty_days = excluded.default_warranty_days,
      rating_avg            = excluded.rating_avg,
      rating_count          = excluded.rating_count;

-- ─── Shop ↔ category links ──────────────────────────────────────────────────

insert into fixer_categories (fixer_id, category_id)
select f.id, c.id
  from (values
    ('apex-microsoldering-lab', 'phones'),
    ('apex-microsoldering-lab', 'iphone-battery-replacement'),
    ('apex-microsoldering-lab', 'tablets'),
    ('apex-microsoldering-lab', 'electronics'),
    ('silicon-bay-macbook-works', 'laptops'),
    ('silicon-bay-macbook-works', 'macbook-screen-repair'),
    ('silicon-bay-macbook-works', 'laptop-liquid-damage'),
    ('silicon-bay-macbook-works', 'desktops'),
    ('voltcraft-appliance-solutions', 'appliances'),
    ('voltcraft-appliance-solutions', 'refrigerator-compressor-repair'),
    ('voltcraft-appliance-solutions', 'inverter-pcb-repair'),
    ('voltcraft-appliance-solutions', 'small-appliances'),
    ('velocity-cycles-emobility', 'bicycles'),
    ('velocity-cycles-emobility', 'e-scooters'),
    ('crown-time-horology-atelier', 'watches'),
    ('crown-time-horology-atelier', 'bags-leather'),
    ('nextgen-console-diagnostics', 'consoles'),
    ('nextgen-console-diagnostics', 'playstation-hdmi-repair'),
    ('nextgen-console-diagnostics', 'mechanical-keyboard-switch-replacement'),
    ('nextgen-console-diagnostics', 'electronics'),
    ('acousticwave-hifi-engineering', 'audio-equipment'),
    ('acousticwave-hifi-engineering', 'electronics'),
    ('acousticwave-hifi-engineering', 'televisions'),
    ('prism-shutter-camera-clinic', 'cameras'),
    ('prism-shutter-camera-clinic', 'drones'),
    ('prism-shutter-camera-clinic', 'drone-motor-replacement'),
    ('skyward-drone-dynamics', 'drones'),
    ('skyward-drone-dynamics', 'drone-motor-replacement'),
    ('skyward-drone-dynamics', 'smart-home'),
    ('urbanvolt-smarthome-iot', 'smart-home'),
    ('urbanvolt-smarthome-iot', 'inverter-pcb-repair'),
    ('urbanvolt-smarthome-iot', 'appliances'),
    ('heavyduty-power-tools-works', 'power-tools'),
    ('heavyduty-power-tools-works', 'appliances'),
    ('heavyduty-power-tools-works', 'bicycles'),
    ('crystalview-display-hospital', 'televisions'),
    ('crystalview-display-hospital', 'macbook-screen-repair'),
    ('crystalview-display-hospital', 'electronics'),
    ('kitchenpro-small-appliances', 'small-appliances'),
    ('kitchenpro-small-appliances', 'appliances'),
    ('kitchenpro-small-appliances', 'electronics'),
    ('zenith-micromobility-hub', 'e-scooters'),
    ('zenith-micromobility-hub', 'bicycles'),
    ('mastercraft-leather-restorations', 'bags-leather'),
    ('mastercraft-leather-restorations', 'shoes'),
    ('mastercraft-leather-restorations', 'clothes'),
    ('cobbler-co-shoe-spa', 'shoes'),
    ('cobbler-co-shoe-spa', 'bags-leather'),
    ('cobbler-co-shoe-spa', 'clothes'),
    ('threadcrafters-garment-restoration', 'clothes'),
    ('threadcrafters-garment-restoration', 'furniture'),
    ('woodcraft-heirloom-furniture', 'furniture'),
    ('woodcraft-heirloom-furniture', 'power-tools'),
    ('byteforge-workstation-rigs', 'desktops'),
    ('byteforge-workstation-rigs', 'mechanical-keyboard-switch-replacement'),
    ('byteforge-workstation-rigs', 'laptops'),
    ('byteforge-workstation-rigs', 'laptop-liquid-damage'),
    ('icare-precision-apple-hub', 'tablets'),
    ('icare-precision-apple-hub', 'phones'),
    ('icare-precision-apple-hub', 'iphone-battery-replacement'),
    ('icare-precision-apple-hub', 'macbook-screen-repair'),
    ('circuitsurgeon-pcb-motherboards', 'inverter-pcb-repair'),
    ('circuitsurgeon-pcb-motherboards', 'appliances'),
    ('circuitsurgeon-pcb-motherboards', 'refrigerator-compressor-repair'),
    ('circuitsurgeon-pcb-motherboards', 'electronics'),
    ('keymaster-mechanical-keyboards', 'mechanical-keyboard-switch-replacement'),
    ('keymaster-mechanical-keyboards', 'desktops'),
    ('keymaster-mechanical-keyboards', 'consoles'),
    ('coolbreeze-fridge-hvac-experts', 'refrigerator-compressor-repair'),
    ('coolbreeze-fridge-hvac-experts', 'appliances'),
    ('coolbreeze-fridge-hvac-experts', 'small-appliances'),
    ('gamerzone-console-clinic', 'consoles'),
    ('gamerzone-console-clinic', 'playstation-hdmi-repair'),
    ('gamerzone-console-clinic', 'audio-equipment'),
    ('aerofix-drone-aerial-works', 'drones'),
    ('aerofix-drone-aerial-works', 'drone-motor-replacement'),
    ('aerofix-drone-aerial-works', 'cameras'),
    ('metroscreen-express-phone-fix', 'phones'),
    ('metroscreen-express-phone-fix', 'tablets'),
    ('metroscreen-express-phone-fix', 'iphone-battery-replacement'),
    ('optix-zoom-lens-workshop', 'cameras'),
    ('optix-zoom-lens-workshop', 'electronics'),
    ('timbercraft-upholstery-sofa', 'furniture'),
    ('timbercraft-upholstery-sofa', 'bags-leather'),
    ('voltsmart-kitchen-care', 'small-appliances'),
    ('voltsmart-kitchen-care', 'appliances'),
    ('voltsmart-kitchen-care', 'electronics'),
    ('pedalpower-performance-cycles', 'bicycles'),
    ('pedalpower-performance-cycles', 'e-scooters'),
    ('royal-chrono-swiss-service', 'watches'),
    ('royal-chrono-swiss-service', 'bags-leather'),
    ('royal-chrono-swiss-service', 'electronics'),
    ('kestrel-watch-restoration-studio', 'watches'),
    ('kestrel-watch-restoration-studio', 'small-appliances')
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
    'apex-microsoldering-lab',
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
    'silicon-bay-macbook-works',
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
    'voltcraft-appliance-solutions',
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

