import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

interface NewShop {
  slug: string;
  shop_name: string;
  bio: string;
  address: string;
  lat: number;
  lng: number;
  timezone: string;
  verified: boolean;
  photos: string[];
  offers_in_shop: boolean;
  offers_home_service: boolean;
  offers_pickup_drop: boolean;
  working_days: string[];
  opening_time: string;
  closing_time: string;
  hours: Record<string, any>;
  contact_phone: string;
  contact_email: string;
  is_hidden: boolean;
  accepts_bookings: boolean;
  default_warranty_days: number;
  booking_lead_hours: number;
  booking_horizon_days: number;
  response_hours: number;
  rating_avg: number;
  rating_count: number;
  category_slugs: string[];
}

const SHOPS: NewShop[] = [
  {
    slug: "apex-microsoldering-lab",
    shop_name: "Apex Micro-Soldering & Smartphone Lab",
    bio: "Certified SMD and micro-soldering laboratory specializing in complex logic board diagnostics, iPhone and Android screen laminations, and component-level repairs.\n\nEquipped with stereo microscopes, hot air rework stations, and precision thermal imagers. We stock OEM-spec AMOLED panels, original battery cells, and high-frequency charging ports.\n\nEvery repair includes free pre-diagnostic inspection and is protected by FixGrid's 90-day escrow warranty.",
    address: "Shop 14, Ground Floor, Nehru Place Market, New Delhi, Delhi 110019",
    lat: 28.5494,
    lng: 77.2536,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&q=80",
      "https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:00:00",
    closing_time: "20:00:00",
    hours: { sat: { open: "10:30", close: "19:00" }, sun: null },
    contact_phone: "+91 98101 23456",
    contact_email: "service@apexmicrosolder.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.9,
    rating_count: 52,
    category_slugs: ["phones", "iphone-battery-replacement", "tablets", "electronics"]
  },
  {
    slug: "silicon-bay-macbook-works",
    shop_name: "Silicon Bay MacBook & Laptop Works",
    bio: "Bengaluru's premier workstation and ultrabook recovery bench. We fix what authorized centers call 'unfixable' — liquid spill board oxidation, blown capacitors, keyboard matrix faults, and Apple Retina display flex repairs.\n\nWe provide NAND storage upgrades for selected models, GPU reballing, and clean hinge rebuilding. Data integrity is guaranteed: customer drives remain untouched or cloned before teardown.",
    address: "412, 100 Feet Road, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
    lat: 12.9716,
    lng: 77.6412,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&q=80",
      "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:30:00",
    closing_time: "19:30:00",
    hours: { sat: { open: "10:00", close: "18:00" }, sun: null },
    contact_phone: "+91 98450 98765",
    contact_email: "support@siliconbaymac.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.8,
    rating_count: 41,
    category_slugs: ["laptops", "macbook-screen-repair", "laptop-liquid-damage", "desktops"]
  },
  {
    slug: "voltcraft-appliance-solutions",
    shop_name: "VoltCraft Major Appliance Solutions",
    bio: "On-site master engineers for refrigerators, front-load washing machines, microwave inverters, and dishwashers. Equipped with computerized gas manifolds and digital multimeter diagnostics.\n\nOur service vans carry genuine replacement compressors, BLDC drain pumps, thermostats, and inverter PCB modules. Over 80% of faults are resolved on the first visit with upfront part pricing.",
    address: "A-28, Ring Road, Lajpat Nagar IV, New Delhi, Delhi 110024",
    lat: 28.57,
    lng: 77.24,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&q=80",
      "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: false,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    opening_time: "08:30:00",
    closing_time: "20:00:00",
    hours: { sun: { open: "09:00", close: "16:00" } },
    contact_phone: "+91 98112 34567",
    contact_email: "dispatch@voltcraftservice.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 3,
    booking_horizon_days: 7,
    response_hours: 1,
    rating_avg: 4.7,
    rating_count: 36,
    category_slugs: ["appliances", "refrigerator-compressor-repair", "inverter-pcb-repair", "small-appliances"]
  },
  {
    slug: "velocity-cycles-emobility",
    shop_name: "Velocity Cycle Works & E-Mobility Lab",
    bio: "High-precision bicycle workshop and electric micro-mobility diagnostic center. We service Shimano, SRAM, and Campagnolo drivetrains alongside Bafang and Bosch e-bike hub motors.\n\nServices include wheel truing, spoke tension balancing, hydraulic brake bleeding, bottom bracket overhauls, and lithium battery pack load-testing. Free 15-point safety check with every full tune-up.",
    address: "78, 27th Main Road, Sector 1, HSR Layout, Bengaluru, Karnataka 560102",
    lat: 12.9121,
    lng: 77.6446,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80",
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["tue", "wed", "thu", "fri", "sat", "sun"],
    opening_time: "09:00:00",
    closing_time: "19:30:00",
    hours: { sun: { open: "09:00", close: "15:00" }, mon: null },
    contact_phone: "+91 98451 11223",
    contact_email: "pedal@velocitycycles.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 30,
    booking_lead_hours: 2,
    booking_horizon_days: 10,
    response_hours: 2,
    rating_avg: 4.9,
    rating_count: 29,
    category_slugs: ["bicycles", "e-scooters"]
  },
  {
    slug: "crown-time-horology-atelier",
    shop_name: "Crown & Time Horology Atelier",
    bio: "Master horologists servicing luxury Swiss timepieces, vintage automatic movements, and precision quartz chronographs. We handle full movement teardown, ultrasonic cleaning, escapement regulation, and gasket pressure sealing.\n\nEquipped with Witschi timing machines and pressure testing chambers tested up to 20 ATM. We also service heirloom leather straps and deployant clasps.",
    address: "Shop 7, Heritage Arcade, Fort, Mumbai, Maharashtra 400001",
    lat: 18.9322,
    lng: 77.8335,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=1200&q=80",
      "https://images.unsplash.com/photo-1495856458515-0637185db551?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:30:00",
    closing_time: "18:30:00",
    hours: { sat: { open: "11:00", close: "17:00" }, sun: null },
    contact_phone: "+91 98200 44556",
    contact_email: "atelier@crowntime.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 4,
    booking_horizon_days: 21,
    response_hours: 2,
    rating_avg: 4.9,
    rating_count: 48,
    category_slugs: ["watches", "bags-leather"]
  },
  {
    slug: "nextgen-console-diagnostics",
    shop_name: "NextGen Console & Gaming Diagnostics",
    bio: "Dedicated gaming hardware center handling PlayStation 5, Xbox Series X, and Nintendo Switch consoles. Specialized in replacing fractured HDMI 2.1 ports, liquid metal thermal repastes, APU power rail faults, and disc drive laser pickups.\n\nWe also modify and repair custom mechanical keyboards, hot-swap PCB sockets, and Hall effect analogue sticks.",
    address: "Plot 52, Gaffar Market, Karol Bagh, New Delhi, Delhi 110005",
    lat: 28.6514,
    lng: 77.1907,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&q=80",
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "11:00:00",
    closing_time: "20:30:00",
    hours: { sun: null },
    contact_phone: "+91 98118 77665",
    contact_email: "repairs@nextgenconsole.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.8,
    rating_count: 37,
    category_slugs: ["consoles", "playstation-hdmi-repair", "mechanical-keyboard-switch-replacement", "electronics"]
  },
  {
    slug: "acousticwave-hifi-engineering",
    shop_name: "AcousticWave Hi-Fi & Sound Engineering",
    bio: "Vintage and modern audio electronics restoration. We repair tube amplifiers, AV receivers, studio monitors, DACs, and speaker crossovers from Marantz, Denon, Marshall, and Harman Kardon.\n\nServices cover transistor biasing, potentiometer deoxidizing, capacitor recapping, and audio distortion tracing with audio spectrum analyzers.",
    address: "12 Perry Cross Road, Bandra West, Mumbai, Maharashtra 400050",
    lat: 19.0596,
    lng: 72.8295,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&q=80",
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:00:00",
    closing_time: "19:00:00",
    hours: { sat: { open: "11:00", close: "16:00" }, sun: null },
    contact_phone: "+91 98205 12345",
    contact_email: "sound@acousticwave.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 3,
    booking_horizon_days: 14,
    response_hours: 2,
    rating_avg: 4.8,
    rating_count: 24,
    category_slugs: ["audio-equipment", "electronics", "televisions"]
  },
  {
    slug: "prism-shutter-camera-clinic",
    shop_name: "Prism & Shutter Camera Clinic",
    bio: "Specialized optical and digital camera service clinic. We repair mirrorless cameras, digital SLRs, cine lenses, and autofocus motors from Sony, Canon, Nikon, and Fujifilm.\n\nWe provide certified ISO Class 5 clean-bench sensor cleaning, optical collimation, shutter curtain assembly replacement, and electronic stabilization repairs.",
    address: "Shop 21, Kucha Choudhary Camera Market, Chandni Chowk, Delhi 110006",
    lat: 28.6562,
    lng: 77.231,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80",
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:00:00",
    closing_time: "19:00:00",
    hours: { sun: null },
    contact_phone: "+91 98119 55443",
    contact_email: "optics@prismshutter.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.9,
    rating_count: 31,
    category_slugs: ["cameras", "drones", "drone-motor-replacement"]
  },
  {
    slug: "skyward-drone-dynamics",
    shop_name: "Skyward Drone Dynamics & Robotics Lab",
    bio: "Unmanned aerial vehicle (UAV) repair and calibration center. We fix DJI, Autel, and custom FPV drones suffering from crash damage, gimbal roll errors, burned ESCs, and compass desync.\n\nEquipped with dynamic motor balancing rigs, optical flow sensor alignment jigs, and antenna RF diagnostic analyzers. Every flight repair includes ground tests and compass re-calibration.",
    address: "Tower B, Electronic City Phase 1, Bengaluru, Karnataka 560100",
    lat: 12.8452,
    lng: 77.6602,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=1200&q=80",
      "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri"],
    opening_time: "09:00:00",
    closing_time: "18:30:00",
    hours: { sat: { open: "10:00", close: "15:00" }, sun: null },
    contact_phone: "+91 98452 77889",
    contact_email: "hangar@skywarddrone.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 2,
    rating_avg: 4.7,
    rating_count: 19,
    category_slugs: ["drones", "drone-motor-replacement", "smart-home"]
  },
  {
    slug: "urbanvolt-smarthome-iot",
    shop_name: "UrbanVolt Smart Home & IoT Automation",
    bio: "Smart home system technicians and electronic automation diagnostics. We troubleshoot smart locks, motorized curtains, Zigbee/Z-Wave hubs, solar inverter controllers, and Wi-Fi video doorbells.\n\nWe provide on-site electrical wiring isolation, firmware recovery, and surge protector restoration with clean cable dressing.",
    address: "Galleria Market, DLF Phase IV, Sector 28, Gurugram, Haryana 122009",
    lat: 28.4735,
    lng: 77.0864,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1558002038-1055907df827?w=1200&q=80"
    ],
    offers_in_shop: false,
    offers_home_service: true,
    offers_pickup_drop: false,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:00:00",
    closing_time: "19:00:00",
    hours: { sun: { open: "10:00", close: "14:00" } },
    contact_phone: "+91 98104 33221",
    contact_email: "connect@urbanvolt.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 3,
    booking_horizon_days: 10,
    response_hours: 1,
    rating_avg: 4.6,
    rating_count: 22,
    category_slugs: ["smart-home", "inverter-pcb-repair", "appliances"]
  },
  {
    slug: "heavyduty-power-tools-works",
    shop_name: "HeavyDuty Power Tool & Motor Works",
    bio: "Industrial workshop and contractor tool repair. We rebuild angle grinders, rotary hammer drills, circular saws, air compressors, and welding machines from Bosch, Makita, Dewalt, and Stanley.\n\nArmature rewinding, carbon brush renewal, chuck realignment, and bearing replacements performed with high-grade industrial components.",
    address: "Plot 18, Sector 6 Industrial Area, Faridabad, Haryana 121006",
    lat: 28.4089,
    lng: 77.3178,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "08:30:00",
    closing_time: "19:00:00",
    hours: { sun: null },
    contact_phone: "+91 98115 88990",
    contact_email: "tools@heavydutyworks.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 30,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 2,
    rating_avg: 4.7,
    rating_count: 27,
    category_slugs: ["power-tools", "appliances", "bicycles"]
  },
  {
    slug: "crystalview-display-hospital",
    shop_name: "CrystalView LED & OLED Display Hospital",
    bio: "Specialized display and television repair facility. We fix 4K/8K OLED and QLED panels, backlight LED array strips, T-Con timing boards, and power supply units.\n\nBonding machine on-site for COF (Chip-On-Film) tab bonding to resolve vertical lines and flickering displays without costly complete panel replacement.",
    address: "Atta Market, Sector 18, Noida, Uttar Pradesh 201301",
    lat: 28.5708,
    lng: 77.3261,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    opening_time: "10:00:00",
    closing_time: "20:30:00",
    hours: { sun: { open: "11:00", close: "18:00" } },
    contact_phone: "+91 98117 22334",
    contact_email: "displays@crystalview.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.8,
    rating_count: 39,
    category_slugs: ["televisions", "macbook-screen-repair", "electronics"]
  },
  {
    slug: "kitchenpro-small-appliances",
    shop_name: "KitchenPro Small Appliance Hub",
    bio: "Quick-turnaround repair for kitchen and dining appliances: espresso and bean-to-cup coffee machines, air fryers, food processors, induction cooktops, and high-speed blenders.\n\nDescaling, heating element replacement, motor coupling overhaul, and PCB repair with genuine manufacturer spare parts.",
    address: "Pocket 2, Sector 8, Rohini, New Delhi, Delhi 110085",
    lat: 28.7159,
    lng: 77.1126,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:30:00",
    closing_time: "19:30:00",
    hours: { sun: null },
    contact_phone: "+91 98108 99001",
    contact_email: "service@kitchenpro.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 30,
    booking_lead_hours: 2,
    booking_horizon_days: 10,
    response_hours: 1,
    rating_avg: 4.6,
    rating_count: 23,
    category_slugs: ["small-appliances", "appliances", "electronics"]
  },
  {
    slug: "zenith-micromobility-hub",
    shop_name: "Zenith Micro-Mobility & E-Riders Hub",
    bio: "Electric scooter, hoverboard, and e-bike engineering center. We repair Xiaomi, Ather, Ola, and generic e-scooter battery management systems (BMS), motor controllers, solid tire replacements, and disc brakes.\n\nSafety inspections, water intrusion drying, and throttle sensor calibrations performed on dedicated test benches.",
    address: "Lane 5, Koregaon Park, Pune, Maharashtra 411001",
    lat: 18.5362,
    lng: 73.894,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1596516109370-29001ec8ec36?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:00:00",
    closing_time: "19:00:00",
    hours: { sat: { open: "10:00", close: "17:00" }, sun: null },
    contact_phone: "+91 98230 66778",
    contact_email: "rides@zenithmobility.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.8,
    rating_count: 33,
    category_slugs: ["e-scooters", "bicycles"]
  },
  {
    slug: "mastercraft-leather-restorations",
    shop_name: "MasterCraft Leather & Bag Restorations",
    bio: "Artisanal leather restoration and luxury handbag repair. We restore designer bags, briefcases, leather jackets, and luggage from Louis Vuitton, Gucci, Prada, and Coach.\n\nServices include edge paint restoration, zipper and slider replacement, deep cleaning, colour touch-up, and hardware replating.",
    address: "Shop 12A, Middle Lane, Khan Market, New Delhi, Delhi 110003",
    lat: 28.6003,
    lng: 77.2273,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:30:00",
    closing_time: "19:30:00",
    hours: { sun: null },
    contact_phone: "+91 98114 11223",
    contact_email: "care@mastercraftleather.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 4,
    booking_horizon_days: 21,
    response_hours: 2,
    rating_avg: 4.9,
    rating_count: 45,
    category_slugs: ["bags-leather", "shoes", "clothes"]
  },
  {
    slug: "cobbler-co-shoe-spa",
    shop_name: "Cobbler & Co. Heritage Shoe Spa & Repair",
    bio: "Footwear reconditioning, resoling, and leather shoe spa. We replace worn Vibram outsoles, heel blocks, inner linings, and broken eyelets on formal leather shoes, boots, and luxury sneakers.\n\nFull deep-steam sanitization, stain removal, leather conditioning, and waterproof sealing on all pairs.",
    address: "14th Road, Khar West, Mumbai, Maharashtra 400052",
    lat: 19.0688,
    lng: 72.8364,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:00:00",
    closing_time: "20:00:00",
    hours: { sun: null },
    contact_phone: "+91 98201 99887",
    contact_email: "spa@cobblerco.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 30,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.7,
    rating_count: 38,
    category_slugs: ["shoes", "bags-leather", "clothes"]
  },
  {
    slug: "threadcrafters-garment-restoration",
    shop_name: "ThreadCrafters Garment Restoration & Alterations",
    bio: "Bespoke tailoring, zipper replacements, seam reconstruction, and fine garment restoration. We repair wool suits, down jackets, designer dresses, and vintage denim.\n\nInvisible mending, tear reweaving, lining replacement, and custom resizing by master tailors with decades of sartorial craftsmanship.",
    address: "56 Commercial Street, Tasker Town, Bengaluru, Karnataka 560001",
    lat: 12.9822,
    lng: 77.6083,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:00:00",
    closing_time: "19:30:00",
    hours: { sun: null },
    contact_phone: "+91 98455 33445",
    contact_email: "tailor@threadcrafters.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 30,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.8,
    rating_count: 26,
    category_slugs: ["clothes", "furniture"]
  },
  {
    slug: "woodcraft-heirloom-furniture",
    shop_name: "WoodCraft & Heirloom Furniture Restorers",
    bio: "Wood furniture restoration, joint reinforcement, upholstery, and polish. We restore antique teakwood, rosewood, dining tables, recliner mechanisms, and ergonomic office chairs.\n\nFrench polish, polyurethane coating, foam rebuilding, spring renewal, and scratch filling performed on-site or in our carpentry workshop.",
    address: "Block 3, Kirti Nagar Industrial Area, New Delhi, Delhi 110015",
    lat: 28.6508,
    lng: 77.1394,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:30:00",
    closing_time: "19:00:00",
    hours: { sun: null },
    contact_phone: "+91 98116 66554",
    contact_email: "wood@woodcraftrestorers.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 4,
    booking_horizon_days: 21,
    response_hours: 2,
    rating_avg: 4.8,
    rating_count: 35,
    category_slugs: ["furniture", "power-tools"]
  },
  {
    slug: "byteforge-workstation-rigs",
    shop_name: "ByteForge Custom PC & Workstation Rigs",
    bio: "High-performance desktop PCs, gaming rigs, and enterprise workstation builders. We troubleshoot blue screens (BSOD), overheating, GPU artifacting, and dead power supplies.\n\nCustom liquid cooling loop maintenance, thermal pad replacement, cable management, BIOS flashing, and memory stability tuning with synthetic benchmarking.",
    address: "Shop 18, SP Road, Bengaluru, Karnataka 560002",
    lat: 12.9654,
    lng: 77.5835,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:30:00",
    closing_time: "20:00:00",
    hours: { sun: null },
    contact_phone: "+91 98459 11990",
    contact_email: "rigs@byteforge.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.9,
    rating_count: 42,
    category_slugs: ["desktops", "mechanical-keyboard-switch-replacement", "laptops", "laptop-liquid-damage"]
  },
  {
    slug: "icare-precision-apple-hub",
    shop_name: "iCare Precision Tablet & Apple Care Hub",
    bio: "Precision iPad, iPhone, and Apple Watch repair center. We specialize in iPad digitizer lamination, swollen battery extraction, bent aluminum housing straightening, and FaceID flex repairs.\n\nClean room environment prevents dust inclusion between display layers. Fast turnarounds with guaranteed 90-day FixGrid escrow protection.",
    address: "Lokhandwala Complex, Andheri West, Mumbai, Maharashtra 400053",
    lat: 19.1363,
    lng: 72.8277,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    opening_time: "10:00:00",
    closing_time: "20:30:00",
    hours: { sun: { open: "11:00", close: "18:00" } },
    contact_phone: "+91 98203 77889",
    contact_email: "care@icareapplehub.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.9,
    rating_count: 57,
    category_slugs: ["tablets", "phones", "iphone-battery-replacement", "macbook-screen-repair"]
  },
  {
    slug: "circuitsurgeon-pcb-motherboards",
    shop_name: "CircuitSurgeon Inverter & Motherboard Care",
    bio: "Component-level electronic board repair for inverter ACs, refrigerator PCBs, smart TVs, and washing machine digital controllers.\n\nOscilloscope signal tracing, PWM controller replacement, IGBT transistor swapping, and conformal coating to protect against moisture and short circuits.",
    address: "Okhla Phase 2, Industrial Area, New Delhi, Delhi 110020",
    lat: 28.5284,
    lng: 77.2796,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:00:00",
    closing_time: "18:30:00",
    hours: { sun: null },
    contact_phone: "+91 98113 44556",
    contact_email: "boards@circuitsurgeon.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 3,
    booking_horizon_days: 14,
    response_hours: 2,
    rating_avg: 4.8,
    rating_count: 31,
    category_slugs: ["inverter-pcb-repair", "appliances", "refrigerator-compressor-repair", "electronics"]
  },
  {
    slug: "keymaster-mechanical-keyboards",
    shop_name: "KeyMaster Custom Keyboard & Switch Lab",
    bio: "Enthusiast mechanical keyboard servicing, switch lubing (Krytox 205g0), stabilizer tuning, PCB trace repairing, and custom USB-C port soldering.\n\nWe fix chatter, unresponsive keys, broken hot-swap sockets, and liquid spilled boards for gaming and productivity keyboards.",
    address: "5th Block, Koramangala, Bengaluru, Karnataka 560095",
    lat: 12.9352,
    lng: 77.6245,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "11:00:00",
    closing_time: "19:00:00",
    hours: { sun: null },
    contact_phone: "+91 98453 88776",
    contact_email: "switches@keymasterlab.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.9,
    rating_count: 28,
    category_slugs: ["mechanical-keyboard-switch-replacement", "desktops", "consoles"]
  },
  {
    slug: "coolbreeze-fridge-hvac-experts",
    shop_name: "CoolBreeze Refrigerator & Cooling Experts",
    bio: "Specialized refrigeration and cooling appliance repair. We fix side-by-side frost-free refrigerators, inverter compressors, defrost thermostats, and gas leakage.\n\nEquipped with nitrogen pressure testing kits and recovery machines to service R600a and R134a refrigerants safely.",
    address: "Sushant Lok Phase 1, Sector 43, Gurugram, Haryana 122002",
    lat: 28.4595,
    lng: 77.0725,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=1200&q=80"
    ],
    offers_in_shop: false,
    offers_home_service: true,
    offers_pickup_drop: false,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    opening_time: "08:00:00",
    closing_time: "20:00:00",
    hours: { sun: { open: "09:00", close: "17:00" } },
    contact_phone: "+91 98109 44332",
    contact_email: "hvac@coolbreezeexperts.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 2,
    booking_horizon_days: 7,
    response_hours: 1,
    rating_avg: 4.8,
    rating_count: 44,
    category_slugs: ["refrigerator-compressor-repair", "appliances", "small-appliances"]
  },
  {
    slug: "gamerzone-console-clinic",
    shop_name: "GamerZone Console Clinic & HDMI Pros",
    bio: "Hyderabad's gaming console specialists: HDMI port micro-soldering, internal power supply repairs, disc laser replacement, and thermal cooling overhauls for PS4, PS5, and Xbox.\n\nSame-day port repairs with microscopes and heavy-duty reinforced solder joints.",
    address: "Near Image Hospital, Madhapur, Hyderabad, Telangana 500081",
    lat: 17.4483,
    lng: 78.3915,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:30:00",
    closing_time: "20:00:00",
    hours: { sun: null },
    contact_phone: "+91 98490 22334",
    contact_email: "gaming@gamerzoneclinic.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.7,
    rating_count: 32,
    category_slugs: ["consoles", "playstation-hdmi-repair", "audio-equipment"]
  },
  {
    slug: "aerofix-drone-aerial-works",
    shop_name: "AeroFix Drone & Aerial Camera Workshop",
    bio: "Certified aerial camera and multirotor drone service station. We stock brushless motors, carbon fiber arms, ESC power distribution boards, and optical landing sensors.\n\nFirmware recalibrations, IMU calibration, and pre-delivery flight testing inside an enclosed safety cage.",
    address: "Baner Road, Baner, Pune, Maharashtra 411045",
    lat: 18.559,
    lng: 73.7868,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:30:00",
    closing_time: "18:30:00",
    hours: { sun: null },
    contact_phone: "+91 98220 55443",
    contact_email: "hangar@aerofixdrones.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 2,
    booking_horizon_days: 14,
    response_hours: 2,
    rating_avg: 4.8,
    rating_count: 21,
    category_slugs: ["drones", "drone-motor-replacement", "cameras"]
  },
  {
    slug: "metroscreen-express-phone-fix",
    shop_name: "MetroScreen Express Phone & Display Fix",
    bio: "Fast, reliable express smartphone repairs in the heart of Delhi. Cracked screen glass laminations, original battery replacements, ear speaker cleaning, and water splash treatment.\n\n30-minute turnarounds on common iPhone and Samsung screen swaps while you wait. Covered under FixGrid 90-day escrow warranty.",
    address: "Block M, Middle Circle, Connaught Place, New Delhi, Delhi 110001",
    lat: 28.6315,
    lng: 77.2167,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:00:00",
    closing_time: "20:00:00",
    hours: { sun: null },
    contact_phone: "+91 98102 66778",
    contact_email: "express@metroscreen.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 1,
    booking_horizon_days: 7,
    response_hours: 1,
    rating_avg: 4.8,
    rating_count: 63,
    category_slugs: ["phones", "tablets", "iphone-battery-replacement"]
  },
  {
    slug: "optix-zoom-lens-workshop",
    shop_name: "Optix & Zoom Precision Lens Workshop",
    bio: "Dedicated optical lens and camera body servicing lab. We fix zoom barrel jamming, fungus on internal elements, aperture blade sticking, and electronic contacts oxidation.\n\nLaser collimation and MTF resolution testing ensure factory-grade optical sharpness after reassembly.",
    address: "Flora Fountain, Fort, Mumbai, Maharashtra 400001",
    lat: 18.9322,
    lng: 72.8335,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:00:00",
    closing_time: "18:30:00",
    hours: { sat: { open: "10:30", close: "16:00" }, sun: null },
    contact_phone: "+91 98204 88776",
    contact_email: "lens@optixzoom.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 3,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.9,
    rating_count: 36,
    category_slugs: ["cameras", "electronics"]
  },
  {
    slug: "timbercraft-upholstery-sofa",
    shop_name: "TimberCraft Upholstery & Sofa Clinic",
    bio: "In-home furniture repair, reupholstery, and frame restoration. We renew saggy sofas, replace broken webbing and high-density foam, repair recliner cables, and fix wobbly dining chairs.\n\nWide fabric catalog brought to your home: stain-resistant velvets, breathable linens, and genuine leathers.",
    address: "ITPL Main Road, Whitefield, Bengaluru, Karnataka 560066",
    lat: 12.9698,
    lng: 77.7499,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1200&q=80"
    ],
    offers_in_shop: false,
    offers_home_service: true,
    offers_pickup_drop: false,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:00:00",
    closing_time: "19:00:00",
    hours: { sun: { open: "10:00", close: "15:00" } },
    contact_phone: "+91 98457 44332",
    contact_email: "sofa@timbercraft.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 60,
    booking_lead_hours: 3,
    booking_horizon_days: 14,
    response_hours: 2,
    rating_avg: 4.7,
    rating_count: 29,
    category_slugs: ["furniture", "bags-leather"]
  },
  {
    slug: "voltsmart-kitchen-care",
    shop_name: "VoltSmart Kitchen Equipment Care",
    bio: "Domestic and commercial kitchen appliance repair. Microwaves, blenders, OTGs, induction hobs, and electric kettles.\n\nHigh-voltage magnetron replacements, door interlock switch fixes, and thermal fuse renewals with safety insulation testing.",
    address: "SV Road, Goregaon West, Mumbai, Maharashtra 400062",
    lat: 19.1663,
    lng: 72.8526,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1585515320310-259814833e62?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "09:30:00",
    closing_time: "19:30:00",
    hours: { sun: null },
    contact_phone: "+91 98207 33221",
    contact_email: "kitchen@voltsmartcare.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 30,
    booking_lead_hours: 2,
    booking_horizon_days: 10,
    response_hours: 1,
    rating_avg: 4.6,
    rating_count: 25,
    category_slugs: ["small-appliances", "appliances", "electronics"]
  },
  {
    slug: "pedalpower-performance-cycles",
    shop_name: "PedalPower Performance Cycles & E-Drives",
    bio: "South Delhi's road, MTB, and e-bike workshop. Carbon frame ultrasound crack inspection, tubeless tire conversions, internal cable routing, and electronic gear shifting (Di2/AXS) pairing.\n\nWalk-ins welcome for quick punctures, brake pad replacements, and chain lubrication.",
    address: "Pocket 1, Sector B, Vasant Kunj, New Delhi, Delhi 110070",
    lat: 28.5244,
    lng: 77.1558,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: true,
    offers_pickup_drop: false,
    working_days: ["tue", "wed", "thu", "fri", "sat", "sun"],
    opening_time: "08:30:00",
    closing_time: "19:00:00",
    hours: { sun: { open: "08:30", close: "14:00" }, mon: null },
    contact_phone: "+91 98110 88776",
    contact_email: "support@pedalpowercycles.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 30,
    booking_lead_hours: 2,
    booking_horizon_days: 10,
    response_hours: 1,
    rating_avg: 4.9,
    rating_count: 34,
    category_slugs: ["bicycles", "e-scooters"]
  },
  {
    slug: "royal-chrono-swiss-service",
    shop_name: "Royal Chrono & Swiss Timepiece Service",
    bio: "Vintage and modern luxury watch restoration atelier. We service Rolex, Omega, Tag Heuer, Seiko, and Tissot timepieces.\n\nDemagnetizing, water-resistance gasket renewal, sapphire crystal scratch buffing, and high-frequency escapement synchronization.",
    address: "Inner Circle, Connaught Place, New Delhi, Delhi 110001",
    lat: 28.6328,
    lng: 77.2197,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:30:00",
    closing_time: "19:00:00",
    hours: { sun: null },
    contact_phone: "+91 98103 55667",
    contact_email: "horology@royalchrono.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 4,
    booking_horizon_days: 21,
    response_hours: 2,
    rating_avg: 4.9,
    rating_count: 51,
    category_slugs: ["watches", "bags-leather", "electronics"]
  },
  {
    slug: "kestrel-watch-restoration-studio",
    shop_name: "Kestrel Watch Restoration Studio",
    bio: "Bengaluru's horological bench specializing in vintage mechanical wristwatches, pocket watches, and mantle clocks. Full ultrasonic strip-down, pivot polishing, and balance spring truing.\n\nPre- and post-repair timing graph reports provided with every complete service.",
    address: "Prestige Meridian, MG Road, Bengaluru, Karnataka 560001",
    lat: 12.9756,
    lng: 77.6094,
    timezone: "Asia/Kolkata",
    verified: true,
    photos: [
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80"
    ],
    offers_in_shop: true,
    offers_home_service: false,
    offers_pickup_drop: true,
    working_days: ["mon", "tue", "wed", "thu", "fri", "sat"],
    opening_time: "10:00:00",
    closing_time: "18:00:00",
    hours: { sat: { open: "10:30", close: "15:00" }, sun: null },
    contact_phone: "+91 98458 22110",
    contact_email: "studio@kestrelwatch.example",
    is_hidden: false,
    accepts_bookings: true,
    default_warranty_days: 90,
    booking_lead_hours: 3,
    booking_horizon_days: 14,
    response_hours: 1,
    rating_avg: 4.8,
    rating_count: 32,
    category_slugs: ["watches", "small-appliances"]
  }
];

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log("Fetching repair categories from DB...");
  const { data: dbCategories, error: catErr } = await supabase
    .from("repair_categories")
    .select("id, slug, name");

  if (catErr || !dbCategories) {
    console.error("Failed to load categories:", catErr);
    process.exit(1);
  }

  const categoryMap = new Map<string, string>();
  for (const cat of dbCategories) {
    categoryMap.set(cat.slug.toLowerCase(), cat.id);
  }
  console.log(`Loaded ${dbCategories.length} categories.`);

  console.log(`Inserting ${SHOPS.length} new curated shops...`);

  for (const shop of SHOPS) {
    const { category_slugs, ...shopData } = shop;

    const { data: insertedShop, error: shopErr } = await supabase
      .from("fixer_profiles")
      .insert(shopData)
      .select("id, slug, shop_name")
      .single();

    if (shopErr || !insertedShop) {
      console.error(`Error inserting shop "${shop.shop_name}":`, shopErr);
      continue;
    }

    console.log(`✓ Inserted shop: ${insertedShop.shop_name} (${insertedShop.id})`);

    // Insert category mappings
    const linksToInsert = [];
    for (const slug of category_slugs) {
      const categoryId = categoryMap.get(slug.toLowerCase());
      if (categoryId) {
        linksToInsert.push({
          fixer_id: insertedShop.id,
          category_id: categoryId,
        });
      } else {
        console.warn(`  [!] Category slug "${slug}" not found in DB!`);
      }
    }

    if (linksToInsert.length > 0) {
      const { error: linkErr } = await supabase
        .from("fixer_categories")
        .insert(linksToInsert);

      if (linkErr) {
        console.error(`  Error linking categories for ${shop.shop_name}:`, linkErr);
      } else {
        console.log(`  Linked ${linksToInsert.length} categories.`);
      }
    }
  }

  console.log("\nDone! Validating category representation...");
  for (const cat of dbCategories) {
    const { count, error } = await supabase
      .from("fixer_categories")
      .select("fixer_id", { count: "exact", head: true })
      .eq("category_id", cat.id);

    console.log(`- ${cat.name} (${cat.slug}): ${count} shops`);
  }
}

main();
