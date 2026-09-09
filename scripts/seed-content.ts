/**
 * Copy generation for the seeded SEO pages.
 *
 * Real, factually accurate technical diagnostic content, realistic pricing
 * bands, turnaround expectations, preparation checklists, and FAQs.
 * Zero fake customer reviews or fake shops.
 */

import type { Block } from "../src/lib/cms/blocks";

export interface CategorySeed {
  slug: string;
  /** Plural, lowercase — reads naturally mid-sentence. */
  noun: string;
  /** Title-case display name. */
  label: string;
  /** What people bring in, most common first. */
  faults: { symptom: string; cause: string; fix: string; cost: string; time: string }[];
  /** Typical all-in range for the category. */
  priceRange: string;
  /** Typical turnaround. */
  turnaround: string;
  /** Honest guidance on when repair stops making sense. */
  replaceWhen: string;
  /** Things to do before handing the device over. */
  prep: string[];
}

export const CATEGORY_SEEDS: CategorySeed[] = [
  {
    slug: "phones",
    noun: "phones",
    label: "Phone Repair",
    priceRange: "$50–$240",
    turnaround: "same day to 3 days",
    replaceWhen:
      "the quote passes roughly half what the handset is worth secondhand, or the multilayer logic board has catastrophic delamination or severe structural fractures",
    faults: [
      {
        symptom: "Cracked outer screen glass, touch digitizer responsive",
        cause: "The tempered exterior glass shattered upon impact, but the underlying OLED/LCD matrix and capacitive digitizer layer remain intact.",
        fix: "Front screen assembly replacement. On modern smartphones, the protective glass, digitizer, and display panel are optically bonded (OCA), necessitating complete module replacement.",
        cost: "$80–$220",
        time: "1–2 hours",
      },
      {
        symptom: "Battery health degraded, fast drain and sudden cutoffs",
        cause:
          "Lithium-ion cells lose active lithium ions and suffer solid electrolyte interphase (SEI) growth over 500+ charge cycles, causing voltage sag under compute spikes.",
        fix: "Battery pack replacement, safety adhesive pull-tab renewal, and battery health calibration.",
        cost: "$50–$95",
        time: "45–90 minutes",
      },
      {
        symptom: "Intermittent charging, loose USB-C / Lightning port",
        cause:
          "Compacted pocket lint inside the port cavity preventing connector seating, or physically worn connector pins from mechanical stress.",
        fix: "Microscopic port debridement and cleaning. If pins are fractured, replacement of the lower charging flex daughterboard.",
        cost: "$40–$120",
        time: "1 hour",
      },
      {
        symptom: "Liquid immersion, erratic touch or bootloops",
        cause:
          "Corrosive mineral electrolysis bridging surface-mount capacitors and power management IC rails across the logic board.",
        fix: "Immediate board extraction, ultrasonic bath in anhydrous 99.9% isopropyl alcohol, thermal drying, and micro-soldering corroded trace filters.",
        cost: "$90–$220",
        time: "2–4 days",
      },
      {
        symptom: "Rear camera optical image stabilization (OIS) buzzing or blurry",
        cause: "Failed voice-coil motor (VCM) actuators, often caused by high-frequency engine vibrations (e.g., motorcycle handlebar mounts) or drop impacts.",
        fix: "Camera module swap and optical alignment calibration.",
        cost: "$70–$160",
        time: "1–2 hours",
      },
    ],
    prep: [
      "Perform a full local or cloud backup of device data and photos before drop-off",
      "Record your lock screen passcode or be prepared to unlock during initial bench triage",
      "Sign out of remote 'Find My' activation locks if shipping or leaving the device overnight",
      "Remove protective cases, screen films, and SIM/microSD memory cards",
    ],
  },
  {
    slug: "laptops",
    noun: "laptops",
    label: "Laptop Repair",
    priceRange: "$70–$420",
    turnaround: "1–5 days",
    replaceWhen:
      "the mainboard has suffered severe liquid or power-rail failure on a machine over six years old, where a replacement board exceeds current market valuation",
    faults: [
      {
        symptom: "Loud blower fan, chassis hot to touch, CPU thermal throttling",
        cause:
          "Fibrous dust accumulation blocking radiator fin stacks combined with factory thermal paste pump-out and dry-out.",
        fix: "Complete thermal overhaul: heatsink fin de-felting, fan bearing lubrication, and application of high-conductivity thermal paste or phase-change pads.",
        cost: "$70–$130",
        time: "2–4 hours",
      },
      {
        symptom: "Sticky, repeating, or non-responsive keyboard keys",
        cause: "Beverage spill residues inside membrane switches or mechanical scissor-switch clip fatigue.",
        fix: "Keyboard assembly replacement. On modern ultrabooks, this involves riveting or replacing the entire palmrest top case.",
        cost: "$90–$260",
        time: "1–3 days",
      },
      {
        symptom: "Cracked screen or vertical colored lines across panel",
        cause: "Physical impact cracking the TFT glass substrate or damaged low-voltage differential signaling (eDP) flex cables.",
        fix: "Display panel extraction, bezel adhesive restoration, and eDP connector seating.",
        cost: "$120–$320",
        time: "1–2 days",
      },
      {
        symptom: "No power, no charging LED, dead machine",
        cause:
          "Shorted input MOSFETs, blown surface-mount ceramic filtering capacitors, or worn DC power barrel jack / USB-C PD controller.",
        fix: "Board-level micro-soldering diagnostics using thermal imaging and bench power supplies, followed by component-level replacement.",
        cost: "$120–$420",
        time: "3–6 days",
      },
      {
        symptom: "Display hinge separating or cracking bottom housing",
        cause: "High hinge torque fatiguing brass threaded inserts embedded in structural polycarbonate frame plastics.",
        fix: "Hinge replacement, structural epoxy rebuilding of anchor standoffs, and torque loosening to prevent recurrence.",
        cost: "$110–$260",
        time: "2–4 days",
      },
    ],
    prep: [
      "Create a full system backup (Time Machine, File History, or clone disk) prior to service",
      "Include the AC power adapter / OEM charging brick to verify charging circuits",
      "Provide administrative credentials or set up a temporary local technician account",
      "Disable BitLocker / FileVault drive encryption or keep recovery keys accessible",
    ],
  },
  {
    slug: "appliances",
    noun: "appliances",
    label: "Appliance Repair",
    priceRange: "$90–$460",
    turnaround: "1–7 days",
    replaceWhen:
      "a sealed refrigeration system compressor has suffered internal mechanical burnout or the drum bearing housing has cracked on a machine over ten years old",
    faults: [
      {
        symptom: "Washing machine will not drain or spin at end of cycle",
        cause: "Foreign objects (coins, hairpins, debris) jamming the drain pump impeller, or open-circuit drain motor windings.",
        fix: "Pump filter chamber debridement, impeller rotation test, or drain pump motor assembly replacement.",
        cost: "$90–$230",
        time: "1–2 days",
      },
      {
        symptom: "Refrigerator running continuously but cabinet remains warm",
        cause:
          "Heavy dust buildup on exterior condenser coils, failed evaporator fan motor, or defrost system element burnout causing coil icing.",
        fix: "Condenser coil pneumatic clearing, defrost thermostat/heater testing, and evaporator fan replacement.",
        cost: "$120–$380",
        time: "1–3 days",
      },
      {
        symptom: "Dishwasher not cleaning dishes, grit and cloudy film",
        cause: "Mineral scale blocking spray arm orifices, clogged micro-filter mesh, or restricted water inlet valve.",
        fix: "Chemical de-scaling, spray arm dismantling, and inlet solenoid valve replacement.",
        cost: "$90–$210",
        time: "1–2 days",
      },
      {
        symptom: "Clothes dryer takes multiple cycles to dry clothing",
        cause: "Restricted lint exhaust ductwork causing safety thermal cutoffs to trip, or open-circuit heating element coil.",
        fix: "Exhaust duct pneumatic brushing, airflow CFM verification, and nichrome heating element replacement.",
        cost: "$90–$220",
        time: "1 day",
      },
      {
        symptom: "Oven temperature inaccurate or baking unevenly",
        cause: "Drifted platinum RTD temperature sensor probe or cracked bake/broil heating element.",
        fix: "Oven cavity temperature probe calibration and heating element replacement.",
        cost: "$110–$280",
        time: "1–3 days",
      },
    ],
    prep: [
      "Locate the model and serial number plate (usually inside door frames or rear access panel)",
      "Ensure clear, unobstructed physical access to the appliance for in-home visits",
      "Note the exact error codes shown on digital displays and when the failure occurs in the cycle",
      "Check home circuit breakers and verify water shutoff valves are accessible",
    ],
  },
  {
    slug: "bicycles",
    noun: "bicycles",
    label: "Bicycle & E-Bike Repair",
    priceRange: "$40–$280",
    turnaround: "same day to 4 days",
    replaceWhen:
      "the carbon fiber or aluminum frame has suffered structural cracking, or replacement of the entire drivetrain and wheelset exceeds secondhand market value",
    faults: [
      {
        symptom: "Hydraulic disc brakes feel spongy or pull to handlebar",
        cause: "Microscopic air bubbles trapped in hydraulic lines or contaminated brake pad friction material.",
        fix: "Full hydraulic fluid flush and bleed (Mineral Oil or DOT fluid), rotor degreasing, and pad replacement.",
        cost: "$45–$110",
        time: "same day",
      },
      {
        symptom: "Chain slips, skips, or grinds under hill-climbing pedal load",
        cause: "Elongated (stretched) drive chain causing accelerated wear and shark-toothing on rear cassette cogs.",
        fix: "Chain wear gauge measurement, followed by matched replacement of drive chain and rear cassette.",
        cost: "$70–$190",
        time: "1 day",
      },
      {
        symptom: "Gears hesitate, click, or jump across sprockets",
        cause: "Cable tension stretch, contaminated housing liners, or bent rear derailleur hanger.",
        fix: "Hanger alignment gauge truing, cable tension indexing, and limit screw adjustment.",
        cost: "$40–$95",
        time: "same day",
      },
      {
        symptom: "Wheel wobbles, out of true, or rubs against brake pads/frame",
        cause: "Uneven spoke tension across drive and non-drive sides after curb or pothole impacts.",
        fix: "Wheel truing stand alignment, radial and lateral correction, and spoke tensiometer balancing.",
        cost: "$45–$130",
        time: "1–2 days",
      },
      {
        symptom: "E-bike motor cuts out or battery range drastically reduced",
        cause: "Lithium cell group voltage drift, damaged torque sensor wiring, or moisture ingress in motor controller.",
        fix: "BMS cell group voltage diagnostics, harness continuity test, and torque/cadence sensor recalibration.",
        cost: "$90–$280",
        time: "2–4 days",
      },
    ],
    prep: [
      "Bring the bicycle reasonably clean to avoid shop degreasing bench surcharges",
      "Bring the battery key and original charging brick for electric bicycle diagnostics",
      "Inform the mechanic of any previous crashes, unusual creaking noises, or recent adjustments",
    ],
  },
  {
    slug: "watches",
    noun: "watches",
    label: "Watch & Timepiece Repair",
    priceRange: "$40–$520",
    turnaround: "3 days to 4 weeks",
    replaceWhen:
      "a non-jeweled quartz movement without historical or sentimental value is cheaper to swap with a fresh movement than repair",
    faults: [
      {
        symptom: "Quartz watch stopped completely or second hand jumps in 4-second intervals",
        cause: "Depleted silver oxide button cell battery, triggering the low-battery End-of-Life (EOL) indicator circuit.",
        fix: "Battery replacement, caseback gasket inspection with silicone lubrication, and dry pressure testing.",
        cost: "$40–$85",
        time: "same day to 3 days",
      },
      {
        symptom: "Mechanical watch running extremely fast (+30 minutes per day)",
        cause: "Magnetization from laptops, smartphone cases, or speaker magnets causing hairspring coils to stick together.",
        fix: "Horological demagnetization coil treatment and Witschi timing machine rate regulation.",
        cost: "$40–$95",
        time: "1–3 days",
      },
      {
        symptom: "Condensation or water droplets visible underneath the crystal",
        cause: "Perished or compressed crown stem, caseback, or crystal gaskets permitting moisture ingress.",
        fix: "Immediate movement decasing to halt rust, ultrasonic cleaning, gasket renewal, and 10 ATM pressure testing.",
        cost: "$70–$220",
        time: "1–2 weeks",
      },
      {
        symptom: "Mechanical movement losing time, low amplitude, crown stiff to wind",
        cause: "Congealed and dried synthetic lubricants causing increased friction across jeweled pivot bearings.",
        fix: "Complete overhaul: full movement teardown, ultrasonic cleaning, reassembly with specialized Moebius oils, and 5-position regulation.",
        cost: "$180–$520",
        time: "2–4 weeks",
      },
      {
        symptom: "Scratched, chipped, or shattered watch crystal",
        cause: "Physical surface abrasion or impact against mineral glass, acrylic plexiglass, or sapphire crystal.",
        fix: "Diamond-compound polishing for acrylic, or genuine sapphire/mineral crystal replacement and UV curing.",
        cost: "$60–$240",
        time: "1–2 weeks",
      },
    ],
    prep: [
      "State whether you want the exterior case and bracelet polished or kept in unpolished original condition",
      "Bring extra bracelet links or original box and papers if warranty or collector provenance applies",
      "Mention if the timepiece is a family heirloom so all original parts are preserved",
    ],
  },
  {
    slug: "tablets",
    noun: "tablets",
    label: "Tablet & iPad Repair",
    priceRange: "$60–$290",
    turnaround: "same day to 3 days",
    replaceWhen:
      "the main logic board has suffered catastrophic multi-layer fracture or processor failure on older generation devices",
    faults: [
      {
        symptom: "Shattered front glass, touch digitizer unresponsive",
        cause: "Drop impact cracking the glass digitizer or laminated Liquid Retina display.",
        fix: "Display and digitizer assembly replacement using precision heat bed separation and OEM adhesive gaskets.",
        cost: "$90–$260",
        time: "1–2 days",
      },
      {
        symptom: "Battery draining rapidly, tablet shuts down at 30%",
        cause: "Lithium-polymer pouch battery cell wear and capacity degradation.",
        fix: "Chassis heating, battery adhesive solvent release, and fresh high-capacity cell installation.",
        cost: "$70–$140",
        time: "2–4 hours",
      },
      {
        symptom: "USB-C or Lightning port loose, does not register charge",
        cause: "Damaged solder pads or worn retention pins from angled cable strain.",
        fix: "Soldering new charging port assembly onto flex board with reinforced anchor pads.",
        cost: "$65–$130",
        time: "1–2 days",
      },
      {
        symptom: "Bent chassis or frame warping from bag pressure",
        cause: "Thin aluminum unibody enclosure deformed by external pressure.",
        fix: "Precision frame straightening jig reshaping to prevent display stress fractures.",
        cost: "$60–$110",
        time: "1 day",
      },
      {
        symptom: "Apple Pencil / stylus not tracking or recognizing pressure",
        cause: "Damaged digitizer sensor grid or Bluetooth pairing circuit fault.",
        fix: "Digitizer flex connection reseating or front panel sensor array replacement.",
        cost: "$80–$180",
        time: "1–2 days",
      },
    ],
    prep: [
      "Back up tablet to cloud storage or local computer",
      "Disable activation lock and passcode if sending in for service",
      "Remove third-party cases and magnetic keyboard covers",
    ],
  },
  {
    slug: "desktops",
    noun: "desktop computers",
    label: "Desktop PC & Workstation Repair",
    priceRange: "$60–$350",
    turnaround: "1–4 days",
    replaceWhen:
      "core architectural standards (DDR generation, CPU socket) are obsolete and the diagnostic points to multi-component failure",
    faults: [
      {
        symptom: "PC will not turn on, no LEDs, no fan spin",
        cause: "Blown Power Supply Unit (PSU), tripped surge protection, or shorted motherboard VRM.",
        fix: "PSU rail testing with multimeter, bench power load test, and PSU / motherboard replacement.",
        cost: "$70–$180",
        time: "1–2 days",
      },
      {
        symptom: "Random Blue Screen of Death (BSOD), crashes during games or rendering",
        cause: "Defective RAM memory modules, failing GPU VRAM, or corrupted storage drive sectors.",
        fix: "MemTest86 memory diagnostic, SSD SMART health analysis, and faulty module replacement.",
        cost: "$60–$160",
        time: "1–3 days",
      },
      {
        symptom: "Loud grinding fan noise, CPU overheating and throttling",
        cause: "AIO liquid cooler pump failure, air bubbles in block, or dry thermal compound.",
        fix: "Cooler replacement, radiator fin cleaning, and premium thermal paste application.",
        cost: "$65–$190",
        time: "1–2 days",
      },
      {
        symptom: "Slow boot times, freezing when opening folders",
        cause: "Failing mechanical hard drive or degraded NAND flash controller on M.2 NVMe SSD.",
        fix: "Sector-by-sector drive cloning to modern NVMe SSD without data loss.",
        cost: "$90–$250",
        time: "1 day",
      },
      {
        symptom: "No video signal to monitor, GPU fans spinning at maximum speed",
        cause: "Loose PCIe slot connection, failing GPU power stages, or corrupted motherboard BIOS.",
        fix: "CMOS battery reset, BIOS flashback, and PCIe slot micro-soldering inspection.",
        cost: "$70–$220",
        time: "1–3 days",
      },
    ],
    prep: [
      "Back up critical work and personal files to an external drive or cloud",
      "Only bring the desktop tower; cables, monitors, and mice are generally not required unless requested",
      "Provide system login credentials for post-repair stress testing",
    ],
  },
  {
    slug: "consoles",
    noun: "game consoles",
    label: "Gaming Console Repair",
    priceRange: "$50–$210",
    turnaround: "1–3 days",
    replaceWhen:
      "the main custom APU processor has suffered internal silicon failure (e.g. fatal silicon bridge defect)",
    faults: [
      {
        symptom: "HDMI port damaged, pins bent, no display signal on TV",
        cause: "Cable pulled at an angle, dropping console while plugged in, breaking internal HDMI pins.",
        fix: "Micro-soldering replacement of HDMI 2.1 port with solid ground anchor reinforcement.",
        cost: "$75–$140",
        time: "1–2 days",
      },
      {
        symptom: "Console turns off suddenly after 15 minutes of 4K gaming with overheating message",
        cause: "Dust clogging heatsink exhaust fins and oxidized/displaced thermal interface (e.g. liquid metal / paste).",
        fix: "Deep internal teardown, ultrasonic heatsink wash, fan bearing lubrication, and thermal barrier re-application.",
        cost: "$60–$120",
        time: "1 day",
      },
      {
        symptom: "Optical disc drive will not take discs, ejects immediately, or cannot read games",
        cause: "Worn drive belt, jammed loading gears, or laser lens optic laser diode degradation.",
        fix: "Disc drive laser carriage replacement and gear alignment.",
        cost: "$65–$130",
        time: "1–2 days",
      },
      {
        symptom: "Controller analog stick drifts without touching (Stick Drift)",
        cause: "Worn carbon potentiometer tracks inside analog joystick module.",
        fix: "Desoldering old modules and installing magnetic Hall-Effect anti-drift joysticks.",
        cost: "$35–$65",
        time: "same day to 1 day",
      },
      {
        symptom: "Console stuck in boot loop or storage corruption error code",
        cause: "Corrupted internal SSD/HDD or damaged power management IC.",
        fix: "Firmware reinitialization, internal drive replacement, and file system recovery.",
        cost: "$60–$150",
        time: "1–2 days",
      },
    ],
    prep: [
      "Sync game saves to cloud services (PlayStation Plus, Xbox Live, Nintendo Online)",
      "Remove any game discs from optical drives before transport",
      "Bring the power cable and one synced controller",
    ],
  },
  {
    slug: "audio-equipment",
    noun: "audio equipment",
    label: "Audio & Hi-Fi Equipment Repair",
    priceRange: "$60–$380",
    turnaround: "3 days to 3 weeks",
    replaceWhen:
      "proprietary DSP chips or custom transformers are permanently unavailable and cannot be substituted",
    faults: [
      {
        symptom: "Scratchy sound when turning volume/tone knobs, channel drops out",
        cause: "Dust and oxidation on potentiometer carbon tracks and switch contacts.",
        fix: "Precision chemical deoxidation with DeoxIT, contact ultrasonic cleaning, or potentiometer replacement.",
        cost: "$50–$120",
        time: "1–3 days",
      },
      {
        symptom: "Loud 50Hz/60Hz mains hum from speakers even at zero volume",
        cause: "Aged electrolytic power supply filter capacitors drying out and losing capacitance.",
        fix: "Power supply recapping with audio-grade low-ESR capacitors and bridge rectifier testing.",
        cost: "$90–$280",
        time: "1–2 weeks",
      },
      {
        symptom: "Amplifier enters protection mode immediately on power-up",
        cause: "Blown output transistors causing dangerous DC offset voltage at speaker terminals.",
        fix: "Output stage transistor matching, emitter resistor replacement, and bias current calibration.",
        cost: "$120–$350",
        time: "1–3 weeks",
      },
      {
        symptom: "Speaker sound distorted, buzzing on bass notes",
        cause: "Perished foam speaker surrounds (foam rot) or rubbing voice coil.",
        fix: "Speaker refoaming, voice coil centering, and dust cap re-gluing.",
        cost: "$60–$160",
        time: "3–7 days",
      },
      {
        symptom: "Turntable speed unstable (wow & flutter) or tonearm skips",
        cause: "Stretched rubber drive belt, dried motor bearing oil, or misaligned cartridge tracking force.",
        fix: "Belt replacement, motor spindle lubrication, and precision stylus tracking alignment.",
        cost: "$55–$140",
        time: "2–5 days",
      },
    ],
    prep: [
      "Keep original audio cables and power supplies with the unit",
      "Lock turntable tonearms and remove counterweights and dust covers before transport",
      "Note speaker impedance (4Ω, 8Ω) if troubleshooting amplifier output issues",
    ],
  },
  {
    slug: "cameras",
    noun: "cameras and lenses",
    label: "Camera & Lens Repair",
    priceRange: "$70–$390",
    turnaround: "3 days to 3 weeks",
    replaceWhen:
      "optical elements have heavy deep scratches on interior coated elements or sensor delamination has occurred",
    faults: [
      {
        symptom: "Black spots or dust marks on every photo, especially at narrow apertures",
        cause: "Dust particles, pollen, or oil spots adhering to the optical low-pass sensor filter.",
        fix: "Cleanroom wet sensor swab cleaning with specialized optical solvent.",
        cost: "$50–$90",
        time: "same day to 1 day",
      },
      {
        symptom: "Lens autofocus motor hunting, grinding, or failing to lock focus",
        cause: "Damaged ultrasonic / stepping autofocus motor gear train or broken flexible ribbon cable.",
        fix: "Lens optical assembly disassembly and autofocus motor / flex cable replacement.",
        cost: "$90–$260",
        time: "1–2 weeks",
      },
      {
        symptom: "Camera shutter error, black images, or error code on LCD",
        cause: "Physical shutter curtain blade fatigue or shutter motor gearbox wear.",
        fix: "Complete mechanical shutter unit replacement and shutter count recalibration.",
        cost: "$140–$350",
        time: "1–3 weeks",
      },
      {
        symptom: "Lens aperture blades stuck open or closed, oily residue on blades",
        cause: "Helicoid grease migrating onto delicate aperture iris blades causing adhesion.",
        fix: "Aperture mechanism degreasing, ultrasonic blade wash, and fresh synthetic helicoid greasing.",
        cost: "$80–$190",
        time: "1–2 weeks",
      },
      {
        symptom: "Memory card slot pins bent, camera shows 'Card Error'",
        cause: "Forced or upside-down memory card insertion bending contact pins.",
        fix: "Micro-soldering memory card reader socket replacement.",
        cost: "$80–$170",
        time: "3–7 days",
      },
    ],
    prep: [
      "Remove memory cards and third-party strap attachments",
      "Include a fully charged battery for bench testing",
      "Mount the camera body cap to protect the sensor during transit",
    ],
  },
  {
    slug: "smart-home",
    noun: "smart home devices",
    label: "Smart Home & IoT Repair",
    priceRange: "$40–$180",
    turnaround: "1–4 days",
    replaceWhen:
      "device firmware is permanently sunset and cloud backend servers have been completely terminated",
    faults: [
      {
        symptom: "Robot vacuum error: brush roller jammed or wheel motor spinning in circles",
        cause: "Hair wound tightly around drive motor bearings or stripped internal planetary gear teeth.",
        fix: "Motor housing teardown, hair extraction, gear replacement, and optical cliff sensor cleaning.",
        cost: "$50–$120",
        time: "1–2 days",
      },
      {
        symptom: "Robot vacuum battery dying after 15 minutes of cleaning",
        cause: "Degraded lithium battery pack cells failing to supply motor current under vacuum suction.",
        fix: "High-capacity lithium battery pack replacement and BMS reset.",
        cost: "$55–$110",
        time: "1 day",
      },
      {
        symptom: "Smart doorbell / security camera offline, no power, battery not charging",
        cause: "Blown internal thermal fuse, degraded internal lithium-polymer pouch, or corroded outdoor contacts.",
        fix: "Internal battery replacement, contact deoxidation, and weather seal renewal.",
        cost: "$45–$95",
        time: "1–2 days",
      },
      {
        symptom: "Smart speaker audio muffled, buzzing, or microphone unresponsive",
        cause: "Dust accumulation in MEMS microphone ports or torn speaker cone surround.",
        fix: "Acoustic chamber cleaning and micro-soldering replacement of MEMS microphone board.",
        cost: "$45–$90",
        time: "1–2 days",
      },
      {
        symptom: "Smart thermostat display blank or cycling on/off",
        cause: "Blown power supply baseplate resistor or degraded internal backup lithium cell.",
        fix: "Baseplate power component replacement and backup cell renewal.",
        cost: "$60–$130",
        time: "1–3 days",
      },
    ],
    prep: [
      "Bring the charging dock and power supply for robot vacuums",
      "Remove mounting brackets and screws for smart doorbells",
      "Note your Wi-Fi network band (2.4GHz vs 5GHz) if connectivity issues are present",
    ],
  },
  {
    slug: "power-tools",
    noun: "power tools",
    label: "Power Tools & Workshop Equipment",
    priceRange: "$40–$220",
    turnaround: "1–5 days",
    replaceWhen:
      "motor armature windings have experienced complete catastrophic burnout melting internal plastic housing",
    faults: [
      {
        symptom: "Tool sparks heavily from vents, smells like burning ozone, runs weak",
        cause: "Worn carbon brushes sparking against dirty or pitted commutator bars.",
        fix: "Carbon brush set replacement and commutator copper bar polishing/undercutting.",
        cost: "$35–$75",
        time: "same day to 1 day",
      },
      {
        symptom: "Cordless drill / impact driver chuck wobbles or will not grip bits",
        cause: "Worn chuck jaws, damaged spindle bearings, or stripped planetary gearbox gears.",
        fix: "Keyless chuck replacement and gearbox greasing.",
        cost: "$45–$95",
        time: "1–2 days",
      },
      {
        symptom: "Tool trigger switch intermittent or variable speed not working",
        cause: "Fine sawdust infiltrating the variable speed trigger potentiometer and switch contacts.",
        fix: "Sealed trigger switch replacement and wiring harness inspection.",
        cost: "$40–$85",
        time: "1–2 days",
      },
      {
        symptom: "Power tool lithium battery pack blinks error code and will not charge",
        cause: "Individual cell group voltage imbalance tripping low-voltage lock on pack BMS.",
        fix: "BMS diagnostic, cell group bench rebalancing, or individual cell group spot-welding replacement.",
        cost: "$45–$110",
        time: "1–3 days",
      },
      {
        symptom: "Miter saw / table saw blade arbor vibrating heavily",
        cause: "Worn high-RPM spindle bearings or bent arbor flange.",
        fix: "Spindle bearing extraction and replacement with precision sealed bearings.",
        cost: "$60–$140",
        time: "2–4 days",
      },
    ],
    prep: [
      "Wipe heavy sawdust or grease from exterior tool body",
      "Bring the corresponding battery and charger for cordless tool diagnosis",
      "Remove saw blades or router bits before bringing tools to the shop",
    ],
  },
  {
    slug: "televisions",
    noun: "televisions and monitors",
    label: "TV & Monitor Display Repair",
    priceRange: "$70–$320",
    turnaround: "1–5 days",
    replaceWhen:
      "the LCD/OLED glass panel itself has physical impact cracks, as replacement panels typically equal 90% of new TV retail price",
    faults: [
      {
        symptom: "TV has sound and responds to remote, but screen is completely dark (flashlight reveals faint image)",
        cause: "Failed LED backlight strips (open-circuit LED beads) in edge-lit or direct-lit arrays.",
        fix: "Panel disassembly and complete replacement of LED backlight array strips with aluminum-backed bars.",
        cost: "$90–$220",
        time: "1–3 days",
      },
      {
        symptom: "TV will not turn on, power LED clicks or flashes error codes",
        cause: "Blown power supply board (PSU) electrolytic capacitors, bridge rectifiers, or standby regulators.",
        fix: "Component-level power board repair or complete power supply board replacement.",
        cost: "$80–$190",
        time: "1–3 days",
      },
      {
        symptom: "Horizontal lines, color banding, or half the screen distorted",
        cause: "T-Con (Timing Controller) board failure or oxidized flat flex cables.",
        fix: "T-Con board replacement and ribbon cable cleaning.",
        cost: "$70–$160",
        time: "1–2 days",
      },
      {
        symptom: "Smart TV reboots constantly on brand logo (bootloop)",
        cause: "Corrupted eMMC flash memory IC on mainboard.",
        fix: "Mainboard eMMC chip reflashing or mainboard replacement.",
        cost: "$85–$210",
        time: "2–4 days",
      },
      {
        symptom: "HDMI ports not detecting cable inputs or no audio",
        cause: "HDMI switch IC failure from static discharge or lightning surge.",
        fix: "Micro-soldering HDMI controller IC replacement on the main processing board.",
        cost: "$90–$195",
        time: "2–4 days",
      },
    ],
    prep: [
      "Transport TV upright or supported flat on a clean blanket—never lay face-down on hard surfaces",
      "Bring the original TV remote control",
      "Take a clear photo of the model sticker on the rear cabinet",
    ],
  },
  {
    slug: "small-appliances",
    noun: "small kitchen electronics",
    label: "Small Kitchen Appliance Repair",
    priceRange: "$40–$190",
    turnaround: "1–4 days",
    replaceWhen:
      "the plastic casing structure has melted and replacement exceeds standard purchase cost for budget models",
    faults: [
      {
        symptom: "Espresso machine leaking water from group head or low brewing pressure",
        cause: "Hardened group head gasket, clogged three-way solenoid valve, or worn vibratory pump.",
        fix: "Silicone group gasket replacement, solenoid ultrasonic descaling, and pump replacement.",
        cost: "$60–$160",
        time: "1–3 days",
      },
      {
        symptom: "Stand mixer making loud grinding noise or planetary head wobbling",
        cause: "Stripped nylon sacrificial fail-safe gear or dried food-grade grease in gearbox.",
        fix: "Gearbox cleaning, sacrificial worm gear replacement, and fresh food-grade grease packing.",
        cost: "$55–$130",
        time: "1–2 days",
      },
      {
        symptom: "Blender leaking liquid from bottom of pitcher into motor base",
        cause: "Worn blade assembly ball bearings and perished rubber blade gasket.",
        fix: "Blade cutter assembly and bearing seal replacement.",
        cost: "$35–$70",
        time: "same day to 1 day",
      },
      {
        symptom: "Air fryer / toaster oven not heating or heating intermittently",
        cause: "Blown thermal cutoff fuse, failed thermostat, or burnt heating element terminal.",
        fix: "Thermal fuse replacement, thermostat recalibration, and high-temp terminal crimping.",
        cost: "$40–$85",
        time: "1–2 days",
      },
      {
        symptom: "Food processor motor humming but blade not spinning",
        cause: "Blown motor run capacitor or safety lid interlock micro-switch misalignment.",
        fix: "Safety interlock alignment and motor capacitor replacement.",
        cost: "$40–$80",
        time: "1 day",
      },
    ],
    prep: [
      "Wash and empty all coffee grounds, food residues, and liquids before bringing appliance",
      "Bring all detachable parts (pitchers, bowls, portafilters) required for bench testing",
    ],
  },
  {
    slug: "drones",
    noun: "drones and gimbals",
    label: "Drone & Gimbal Repair",
    priceRange: "$60–$280",
    turnaround: "2–5 days",
    replaceWhen:
      "the central core structure has suffered severe delamination and flight controller ICs are non-responsive",
    faults: [
      {
        symptom: "Gimbal overloaded / gimbal motor shaking, horizon unlevel",
        cause: "Bent gimbal roll/yaw motor arm or torn flexible ribbon cable from hard landing.",
        fix: "Gimbal ribbon flex cable replacement and motor optical alignment calibration.",
        cost: "$70–$180",
        time: "2–4 days",
      },
      {
        symptom: "Drone arm cracked or motor failing to spin on startup",
        cause: "Structural composite arm fracture or damaged electronic speed controller (ESC).",
        fix: "Arm shell replacement, brushless motor swap, and ESC micro-soldering.",
        cost: "$65–$160",
        time: "1–3 days",
      },
      {
        symptom: "Vision sensor / obstacle avoidance sensor error on startup",
        cause: "Dislodged stereoscopic optical sensor module or uncalibrated IMU.",
        fix: "Sensor realignment, optical calibration target alignment, and IMU recalibration.",
        cost: "$60–$130",
        time: "1–2 days",
      },
      {
        symptom: "Drone battery error: cell communication error or puffed cells",
        cause: "High discharge cell swelling or BMS communication pin oxidation.",
        fix: "Battery contact restoration, cell diagnostic, and battery safe disposal/replacement.",
        cost: "$40–$120",
        time: "1 day",
      },
      {
        symptom: "Remote controller joystick broken or video transmission dropouts",
        cause: "Damaged RF antenna coaxial connector or worn potentiometer gimbal assembly.",
        fix: "Internal RF antenna lead replacement and stick assembly replacement.",
        cost: "$55–$120",
        time: "1–2 days",
      },
    ],
    prep: [
      "Remove microSD card containing flight footage",
      "Bring the remote controller and at least one charged flight battery",
      "Remove propellers for safe workbench handling",
    ],
  },
  {
    slug: "e-scooters",
    noun: "e-scooters",
    label: "E-Scooter & Micro-Mobility Repair",
    priceRange: "$40–$240",
    turnaround: "same day to 3 days",
    replaceWhen:
      "the main structural folding hinge or deck casting has cracked, posing severe structural safety hazards",
    faults: [
      {
        symptom: "Punctured inner tube or flat tire",
        cause: "Road debris puncture, under-inflation pinch flats, or worn tire tread.",
        fix: "Heavy-duty reinforced tube replacement, puncture sealant injection, or solid puncture-proof tire conversion.",
        cost: "$35–$75",
        time: "same day",
      },
      {
        symptom: "Scooter loses power, display shows error code (e.g. Error 10/14/15/21)",
        cause: "Damaged throttle hall sensor, loose motor phase wire connector, or controller MOSFET failure.",
        fix: "Throttle hall sensor replacement, high-temp phase connector soldering, or controller replacement.",
        cost: "$55–$130",
        time: "1–2 days",
      },
      {
        symptom: "Mechanical or electronic disc brake not stopping scooter efficiently",
        cause: "Worn brake pads, loose caliper cable tension, or warped rotor disc.",
        fix: "Brake pad replacement, cable adjustment, and rotor disc truing.",
        cost: "$35–$70",
        time: "same day",
      },
      {
        symptom: "Stem has noticeable play or wobbles back and forth during riding",
        cause: "Loose folding mechanism clamp bolts, worn hinge bushing, or loose headset bearings.",
        fix: "Headset bearing tightening, reinforced folding latch replacement, and vibration dampener installation.",
        cost: "$35–$80",
        time: "same day",
      },
      {
        symptom: "Battery range severely reduced or scooter shuts down on slight inclines",
        cause: "Broken nickel strip weld between lithium cell groups or degraded battery capacity.",
        fix: "Battery pack teardown, nickel strip spot-welding repair, and BMS balancing.",
        cost: "$70–$210",
        time: "2–4 days",
      },
    ],
    prep: [
      "Bring the scooter charger for electrical and battery diagnostics",
      "Clean off heavy mud or dirt before bringing to the workshop",
      "Note the exact error code appearing on the handlebar display",
    ],
  },
  {
    slug: "macbook-screen-repair",
    noun: "MacBook displays",
    label: "MacBook Screen Repair",
    priceRange: "$140–$480",
    turnaround: "1–3 days",
    replaceWhen:
      "the machine is over seven years old and the logic board has suffered widespread liquid ingress or GPU delamination alongside panel damage",
    faults: [
      {
        symptom: "Cracked Retina glass or vertical lines across Liquid Retina panel",
        cause:
          "Mechanical stress or foreign object (like a webcam cover or pen) closed inside the clamshell, fracturing the ultra-thin TFT glass substrate.",
        fix: "Complete upper display clamshell assembly swap or raw LCD panel replacement with optical backlight calibration.",
        cost: "$180–$480",
        time: "1–2 days",
      },
      {
        symptom: "Stage light effect or backlight cut-off when opening lid past 45 degrees ('Flexgate')",
        cause:
          "Fatigue tearing in the integrated flexible display backlight ribbon cable due to repeated lid hinge cycling.",
        fix: "Precision micro-soldering ribbon cable extension or full display assembly replacement.",
        cost: "$120–$260",
        time: "1–2 days",
      },
      {
        symptom: "Dim display with no backlight, Apple logo barely visible with external flashlight",
        cause:
          "Blown backlight fuse, failed LP8550/LP8548 LED driver IC, or shorted ceramic capacitor on the 50V backlight rail.",
        fix: "Logic board micro-soldering, backlight power rail troubleshooting, and driver IC replacement.",
        cost: "$140–$290",
        time: "2–3 days",
      },
      {
        symptom: "Damaged silicone rubber perimeter gasket and chipped aluminum lid corners",
        cause: "Impact drops on corner edges deforming aluminum bezels and compromising display dust sealing.",
        fix: "Corner metal chassis reshaping, gasket renewal, and panel realigning.",
        cost: "$70–$140",
        time: "1 day",
      },
    ],
    prep: [
      "Perform a full Time Machine or cloud backup of your macOS data",
      "Sign out of Apple ID and disable Find My Mac before drop-off",
      "Provide user login passcode or configure a temporary guest account for post-repair bench testing",
    ],
  },
  {
    slug: "iphone-battery-replacement",
    noun: "iPhone batteries",
    label: "iPhone Battery Replacement",
    priceRange: "$45–$95",
    turnaround: "45–90 minutes",
    replaceWhen:
      "the chassis is severely twisted or logic board layers have delaminated from violent drops",
    faults: [
      {
        symptom: "Maximum capacity health below 80% with iOS 'Service' battery advisory",
        cause:
          "Chemical aging of lithium-ion pouch cells after 500+ full charge-discharge cycles, elevating internal cell resistance.",
        fix: "Installation of certified OEM-grade replacement battery, new stretch-release adhesive pull-tabs, and battery health calibration.",
        cost: "$45–$85",
        time: "45–60 minutes",
      },
      {
        symptom: "Device abruptly powers down at 20–30% during photo capture or intensive app loading",
        cause:
          "Worn electrode chemistry unable to supply peak operating voltage during CPU/GPU burst frequencies, triggering protective shutdown.",
        fix: "Battery pack replacement and fuel gauge IC impedance reset.",
        cost: "$50–$90",
        time: "45 minutes",
      },
      {
        symptom: "Screen lifting from frame or back glass bulging from battery expansion",
        cause:
          "Gaseous electrolyte decomposition caused by overcharging, micro-punctures, or thermal stress producing flammable internal gas pockets.",
        fix: "Urgent hazardous battery safe removal in ESD-safe fireproof station and structural frame inspection.",
        cost: "$55–$95",
        time: "1 hour",
      },
      {
        symptom: "Phone warms up significantly during basic web browsing and battery percentage jumps erratically",
        cause: "Internal micro-short circuiting across separator membranes or failed BMS thermistor resistor.",
        fix: "Battery module replacement and thermal camera diagnostics across PMIC power lines.",
        cost: "$50–$90",
        time: "1 hour",
      },
    ],
    prep: [
      "Create an iCloud or iTunes local computer backup before servicing",
      "Discharge battery below 25% if possible to minimize thermal hazard during adhesive pull-tab extraction",
      "Turn off Find My iPhone in settings to allow bench diagnostic authorization",
    ],
  },
  {
    slug: "playstation-hdmi-repair",
    noun: "PlayStation & Xbox HDMI ports",
    label: "PlayStation HDMI Port Repair",
    priceRange: "$75–$160",
    turnaround: "1–2 days",
    replaceWhen:
      "the main APU processor has suffered silicon fracturing or Southbridge motherboard burns beyond micro-soldering recovery",
    faults: [
      {
        symptom: "White Light of Death (WLOD) — console boots to white light but TV displays 'No Signal'",
        cause:
          "Blown Panasonic MN864739 / Texas Instruments HDMI retimer transmitter IC or damaged ESD filtering diodes.",
        fix: "Micro-soldering replacement of the HDMI encoder chip, filter array inspection, and thermal paste renewal.",
        cost: "$95–$160",
        time: "1–2 days",
      },
      {
        symptom: "Bent, flattened, or missing gold contact pins inside the rear HDMI jack",
        cause: "Tripping over HDMI cables, inserting cords at harsh angles, or aggressive port insertion during relocation.",
        fix: "Hot-air desoldering of damaged port, through-hole solder sucker clearing, and precision alignment of new reinforced OEM socket.",
        cost: "$75–$130",
        time: "2–4 hours",
      },
      {
        symptom: "Torn micro-copper PCB solder traces from violent cable pulls",
        cause: "Excessive lateral force tearing conductive copper pads directly off the top motherboard layer.",
        fix: "Micro-wire jumpering using 0.02mm enameled copper wire and ultraviolet (UV) curable solder mask insulation.",
        cost: "$95–$150",
        time: "1–2 days",
      },
      {
        symptom: "Display flickers, drops resolution to 480p, or flashes snow-like static artifacts",
        cause: "Fractured cold solder joints on TMDS high-speed differential signal pins from thermal cycling.",
        fix: "Full connector reflow with rosin-flux and silver-bearing lead-free solder alloy.",
        cost: "$65–$110",
        time: "2 hours",
      },
    ],
    prep: [
      "Eject any physical game discs from the optical drive before packing the console",
      "Leave external power and HDMI cables at home unless specifically requested by technician",
      "Perform a PlayStation Plus or USB flash drive save data backup",
    ],
  },
  {
    slug: "laptop-liquid-damage",
    noun: "liquid-damaged laptops",
    label: "Laptop Liquid Damage Repair",
    priceRange: "$110–$380",
    turnaround: "2–5 days",
    replaceWhen:
      "liquid electrolysis has burned carbonized trenches through internal multi-layer PCB substrate ground planes",
    faults: [
      {
        symptom: "Device completely dead with no power LEDs after water, coffee, or soda spill",
        cause:
          "Corrosive mineral electrolysis bridging surface-mount capacitors and burning main input power MOSFETs (PPBUS / 19V rail).",
        fix: "Full motherboard extraction, ultrasonic cleaning bath in 99.9% anhydrous isopropyl alcohol, and micro-soldering shorted MOSFETs.",
        cost: "$120–$340",
        time: "2–4 days",
      },
      {
        symptom: "Sticky, repeating, or unresponsive keys and trackpad glitching after spill",
        cause: "Liquid residues drying into conductive syrupy films inside membrane switches and trackpad sensor grids.",
        fix: "Keyboard assembly swap and trackpad flex cable contact ultrasonic cleaning.",
        cost: "$90–$210",
        time: "1–2 days",
      },
      {
        symptom: "Backlight failure with faint ghost image on screen after liquid entered hinge vent",
        cause: "Corroded display eDP connector pins shorting high-voltage backlight rails to low-voltage data lanes.",
        fix: "Connector desoldering, PCB pad cleaning, and replacement of eDP socket and fuse.",
        cost: "$110–$240",
        time: "2 days",
      },
      {
        symptom: "Battery status displays 'No Battery Detected' or charging stops abruptly at 1%",
        cause: "Corroded SMBus battery data clock and data pull-up resistors on the charging daughterboard.",
        fix: "SMBus data line tracing, resistor replacement, and battery connector cleaning.",
        cost: "$90–$180",
        time: "1–2 days",
      },
    ],
    prep: [
      "DO NOT plug into AC charger or try repeatedly to turn on a wet laptop",
      "DO NOT place the device in uncooked rice — dry starch creates caustic paste inside ports",
      "Wipe exterior liquid with a clean towel and bring device to repair bench as fast as possible",
    ],
  },
  {
    slug: "inverter-pcb-repair",
    noun: "inverter appliance PCBs",
    label: "Inverter PCB Motherboard Repair",
    priceRange: "$65–$190",
    turnaround: "1–4 days",
    replaceWhen:
      "the central microcontroller firmware ROM is permanently corrupted or the compressor itself has locked rotor with burnt motor windings",
    faults: [
      {
        symptom: "Outdoor AC unit fan spins but compressor does not start, blinking communication error",
        cause:
          "Blown Intelligent Power Module (IPM) IGBT transistor bridge unable to generate 3-phase variable frequency drive power.",
        fix: "IPM chip desoldering, thermal paste re-application, and replacement of driving gate resistors.",
        cost: "$80–$180",
        time: "2–3 days",
      },
      {
        symptom: "Appliance dead after thunderstorm or high-voltage grid spike",
        cause: "High-voltage surge tripping metal oxide varistors (MOVs) and destroying ceramic fuse and input bridge rectifier.",
        fix: "Power surge protection stage rebuild: MOV replacement, rectifier replacement, and trace repair.",
        cost: "$65–$130",
        time: "1 day",
      },
      {
        symptom: "Compressor starts for 30 seconds then stops repeatedly with DC bus undervoltage error",
        cause: "Degraded 450V electrolytic filter capacitors losing capacitance and creating severe DC ripple under load.",
        fix: "High-voltage capacitor replacement with high-temp 105°C rated low-ESR capacitors.",
        cost: "$70–$140",
        time: "1–2 days",
      },
      {
        symptom: "Indoor and outdoor unit communication failure (e.g., E6 / CH05 error codes)",
        cause: "Failed optocoupler optical isolators and burnt current-limiting resistors on the serial data link line.",
        fix: "Optocoupler replacement and 24V communication loop diode testing.",
        cost: "$60–$120",
        time: "1 day",
      },
    ],
    prep: [
      "Note down the exact error code or count the flashing LED pulses on the outdoor unit PCB",
      "Turn off the mains breaker before inspecting or disconnecting appliance wiring",
      "Take clear smartphone photos of all color-coded PCB terminal connections before drop-off",
    ],
  },
  {
    slug: "refrigerator-compressor-repair",
    noun: "refrigerator compressors",
    label: "Refrigerator Compressor Repair",
    priceRange: "$95–$290",
    turnaround: "same day to 2 days",
    replaceWhen:
      "the internal cabinet evaporator tubing has suffered hidden pinhole corrosion inside non-serviceable polyurethane foam insulation",
    faults: [
      {
        symptom: "Clicking noise from compressor every few minutes, but cooling does not begin",
        cause: "Burned PTC starter relay or open overload protector preventing the motor starting winding from energizing.",
        fix: "PTC starter relay replacement, overload protector renewal, and run capacitor testing.",
        cost: "$75–$130",
        time: "1–2 hours",
      },
      {
        symptom: "Compressor runs continuously but refrigerator and freezer are barely lukewarm",
        cause: "Refrigerant gas leak at copper-to-steel braze joints or discharge tube vibration fracture.",
        fix: "Nitrogen pressure leak testing, brazing repair, filter drier replacement, vacuum pull, and precision R600a/R134a charging.",
        cost: "$120–$280",
        time: "3–6 hours",
      },
      {
        symptom: "Inverter compressor not modulating speed or vibrating violently",
        cause: "Inverter inverter inverter driver board phase imbalance or seized internal mechanical crankshaft bearings.",
        fix: "Inverter driver PCB testing and compressor replacement with original hermetic motor unit.",
        cost: "$180–$310",
        time: "1–2 days",
      },
      {
        symptom: "Capillary tube frost build-up and compressor overheating",
        cause: "Moisture or burned oil sludge freezing inside tiny 0.8mm capillary metering tube.",
        fix: "System flush with dry nitrogen, capillary tube replacement, and new desiccant filter drier.",
        cost: "$110–$220",
        time: "4–6 hours",
      },
    ],
    prep: [
      "Clear items away from the bottom and rear vents of the refrigerator",
      "Leave the refrigerator unplugged if the compressor is clicking repeatedly to prevent motor burnout",
      "Check model number and refrigerant gas type (R600a or R134a) listed on the interior door sticker",
    ],
  },
  {
    slug: "drone-motor-replacement",
    noun: "drone motors & gimbals",
    label: "Drone Motor & Gimbal Repair",
    priceRange: "$60–$180",
    turnaround: "1–3 days",
    replaceWhen:
      "the central unibody carbon-fiber frame has suffered structural delamination or the craft was completely immersed in saltwater",
    faults: [
      {
        symptom: "Gimbal motor overload error and erratic camera shuddering during flight",
        cause: "Bent roll/pitch arm from crash impact or fine dust sand grains wedged in brushless motor airgap.",
        fix: "Gimbal arm straightening, brushless motor cleaning, and multi-axis IMU calibration.",
        cost: "$70–$160",
        time: "1–2 days",
      },
      {
        symptom: "Brushless motor stutters, twitches, or refuses to arm before takeoff",
        cause: "Blown Electronic Speed Controller (ESC) phase MOSFET or severed 3-phase motor wire.",
        fix: "ESC board micro-soldering or brushless motor stator unit replacement.",
        cost: "$65–$140",
        time: "1 day",
      },
      {
        symptom: "Video transmission black screen or flickering camera feed on remote controller",
        cause: "Torn flexible flat ribbon cable (FFC) routed through the hollow gimbal rotational axes.",
        fix: "Precision disassembly and replacement of the high-flex 3-axis gimbal ribbon cable.",
        cost: "$60–$130",
        time: "2–4 hours",
      },
      {
        symptom: "Propeller mount loose or motor bell wobbles with high vibration noise",
        cause: "Deformed titanium motor shaft or crushed precision ball bearings after prop collision.",
        fix: "Rotor bell swap, bearing extraction and replacement, and dynamic vibration testing.",
        cost: "$45–$90",
        time: "2 hours",
      },
    ],
    prep: [
      "Remove damaged propeller blades and camera lens filters before transporting",
      "Bring remote controller, one charged flight battery, and the craft for post-repair flight checks",
      "Remove microSD memory card storing your flight footage",
    ],
  },
  {
    slug: "mechanical-keyboard-switch-replacement",
    noun: "mechanical keyboards",
    label: "Mechanical Keyboard Repair",
    priceRange: "$35–$110",
    turnaround: "same day to 2 days",
    replaceWhen:
      "the PCB has snapped along structural mounting lines or suffered widespread conductive liquid copper dissolution",
    faults: [
      {
        symptom: "Keypress chattering (double-typing) or key failing to register reliably",
        cause: "Oxidized gold crosspoint switch contacts or bent terminal pins inside the switch housing.",
        fix: "Switch desoldering and replacement with genuine Cherry/Gateron/Kailh switch, or contact leaf deoxidation.",
        cost: "$35–$75",
        time: "same day",
      },
      {
        symptom: "Hot-swap socket torn completely off PCB after forcing switch with bent pins",
        cause: "Mechanical shear stress breaking the fragile surface-mount copper solder pads off the fiberglass substrate.",
        fix: "Epoxy anchor reconstruction and micro-jumper wire routing to adjacent matrix trace diode.",
        cost: "$45–$85",
        time: "1–2 hours",
      },
      {
        symptom: "Entire row or column of keys dead simultaneously",
        cause: "Blown 1N4148 switching diode or fractured PCB matrix trace from drop or flex fatigue.",
        fix: "Matrix multimeter continuity diagnosis, diode replacement, and enamel wire trace jumpering.",
        cost: "$40–$80",
        time: "1 day",
      },
      {
        symptom: "Loose, intermittent, or physically broken USB-C socket on keyboard rear",
        cause: "Cord tension ripping the surface-mount USB-C receptacle grounding pins from the PCB.",
        fix: "Hot-air connector replacement and structural epoxy reinforcement of mounting tabs.",
        cost: "$40–$85",
        time: "2 hours",
      },
    ],
    prep: [
      "Remove custom artisan keycaps or delicate accessories before workshop drop-off",
      "Note the specific keys that chatter or fail to actuate",
      "Bring the detachable USB cable used with the keyboard",
    ],
  },
];

export function buildBlocks(seed: CategorySeed, city?: string): Block[] {
  const shortLabel = seed.label.replace(" Repair", "");
  const headingText = city ? `${seed.label} in ${city}` : `${seed.label} Near You`;
  const subtitleText = city
    ? `Compare certified local repair shops fixing ${seed.noun} across ${city}. Upfront diagnostic pricing (${seed.priceRange}), authentic parts, and 90-day warranty protection.`
    : `Compare local independent shops that fix ${seed.noun}, review common component failure costs, and find technicians open right now.`;
  const ctaLabel = city ? `Find ${shortLabel.toLowerCase()} experts in ${city}` : `Find ${shortLabel.toLowerCase()} shops`;
  const ctaHref = city ? `/search?category=${seed.slug}&q=${encodeURIComponent(city)}` : `/search?category=${seed.slug}`;

  return [
    {
      type: "compact_hero",
      eyebrow: city ? `Local ${city} Service Guide` : "Repair & Diagnostic Guide",
      heading: headingText,
      subtitle: subtitleText,
      ctas: [{ label: ctaLabel, href: ctaHref }],
    },
    {
      type: "highlights_strip",
      items: [
        { label: "Typical cost", value: seed.priceRange },
        { label: "Turnaround", value: seed.turnaround },
        { label: "Common faults", value: String(seed.faults.length) },
      ],
    },
    { type: "table_of_contents", title: "On this page" },
    {
      type: "rich_text",
      html: introHtml(seed, city),
      width: "prose",
    },
    {
      type: "feature_grid",
      title: "Common Symptoms & Technical Causes",
      columns: 3,
      items: seed.faults.map((fault) => ({
        title: fault.symptom,
        body: `${fault.cause} ${fault.fix}`,
      })),
    },
    {
      type: "rich_text",
      html: costHtml(seed, city),
      width: "prose",
    },
    {
      type: "text_image",
      heading: "Preparation Checklist Before Drop-Off",
      body: `<ul>${seed.prep.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
      image: {
        src: "/images/bench.jpg",
        alt: `A certified repair technician bench prepared for ${seed.noun}`,
      },
      side: "right",
    },
    {
      type: "rich_text",
      html: chooseShopHtml(seed, city),
      width: "prose",
    },
    {
      type: "faq_accordion",
      title: "Frequently Asked Questions",
      items: buildFaq(seed, city),
    },
    {
      type: "cta_banner",
      heading: city
        ? `Find verified ${shortLabel.toLowerCase()} experts in ${city}`
        : `Find a verified ${shortLabel.toLowerCase()} expert near you`,
      body: city
        ? `Browse local repair shops in ${city} with verified bench tools, transparent pricing, and 90-day warranty coverage.`
        : "Filter by active opening hours, on-site home visits, collection service, and transparent part warranties.",
      cta: {
        label: city ? `Search verified shops in ${city}` : "Search the local directory",
        href: ctaHref,
      },
      tone: "signal",
    },
  ];
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function introHtml(seed: CategorySeed, city?: string): string {
  const cityIntro = city
    ? `<p>If you are located in <strong>${escapeHtml(city)}</strong>, finding dependable technical repair shouldn't mean gambling on unverified shops. FixGrid connects you with certified independent specialists in ${escapeHtml(city)} offering upfront bench estimates, genuine replacement components, and guaranteed 90-day warranty coverage.</p>`
    : "";

  return `
<h2>Is it worth repairing your ${escapeHtml(seed.noun)}?</h2>
${cityIntro}
<p>Most ${escapeHtml(seed.noun)} that develop faults can be repaired reliably for a fraction of the cost of buying new. Choosing repair preserves working hardware, prevents unnecessary electronic waste, and supports independent local trade technicians.</p>
<p>However, transparent advice matters: repair stops making financial sense when ${escapeHtml(seed.replaceWhen)}. A professional shop will provide an honest pre-repair assessment before proceeding with work.</p>
<p>Typical repair costs for ${escapeHtml(seed.noun)} fall within the <strong>${escapeHtml(seed.priceRange)}</strong> range, with standard turnarounds spanning <strong>${escapeHtml(seed.turnaround)}</strong> depending on whether replacement components are in local inventory or require specialist supply ordering.</p>`.trim();
}

function costHtml(seed: CategorySeed, city?: string): string {
  const rows = seed.faults
    .map(
      (fault) =>
        `<tr><td><strong>${escapeHtml(fault.symptom)}</strong></td><td>${escapeHtml(fault.cost)}</td><td>${escapeHtml(fault.time)}</td></tr>`,
    )
    .join("");

  const cityNote = city
    ? `<p>Bench costs in ${escapeHtml(city)} typically reflect standardized regional component pricing and skilled technician labor rates.</p>`
    : "";

  return `
<h2>Realistic Repair Costs & Benchmark Pricing</h2>
<p>The price table below provides verified industry benchmarks for common ${escapeHtml(seed.noun)} repairs. Use these figures to evaluate repair quotes accurately.</p>
${cityNote}
<table>
<thead><tr><th>Fault / Symptom</th><th>Typical Cost Range</th><th>Bench Turnaround</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<h3>Factors That Influence Repair Quotes</h3>
<p><strong>1. Component Quality & Origin:</strong> Genuine OEM parts, certified refurbished original modules, and aftermarket grades differ in cost, color calibration, and durability. Always ask your technician which component tier is quoted.</p>
<p><strong>2. Component-Level Diagnosis:</strong> Technicians who diagnose and micro-solder specific failed resistors, capacitors, or ports save you significant money compared to shops that simply swap out entire expensive sub-assemblies.</p>`.trim();
}

function chooseShopHtml(seed: CategorySeed, city?: string): string {
  const cityContext = city
    ? ` across ${escapeHtml(city)}`
    : "";

  return `
<h2>How to Choose a Reputable Local Repair Shop${cityContext}</h2>
<p>Before leaving your ${escapeHtml(seed.noun)} with a repair shop, ask these four critical questions:</p>
<h3>1. What warranty do you provide on parts and labor?</h3>
<p>Reputable independent repair shops typically offer a 90-day to 1-year written warranty covering both replacement components and bench labor.</p>
<h3>2. Do you perform diagnostics before charging?</h3>
<p>Clear diagnostic estimates ensure you are never surprised by unexpected fees. Ask whether initial bench assessment fees apply toward the final repair cost.</p>
<h3>3. What is your data security policy?</h3>
<p>For electronic devices storing personal information, ensure the shop has strict confidentiality protocols, does not require unnecessary passwords, and never wipes storage drives without your prior authorization.</p>
<h3>4. Are turnaround estimates realistic?</h3>
<p>Confirm whether common parts are on the shelf or need to be ordered, so you have an accurate timeline for pickup.</p>`.trim();
}

function buildFaq(seed: CategorySeed, city?: string): { question: string; answer: string }[] {
  const primary = seed.faults[0];
  const locationText = city ? ` in ${city}` : "";

  const items = [
    {
      question: `How much does ${seed.label.toLowerCase()} typically cost${locationText}?`,
      answer: `Most standard repairs range between ${seed.priceRange}, depending on component availability and whether the fault is a modular replacement or micro-soldering.`,
    },
    {
      question: `How long will the repair take${locationText}?`,
      answer: `Most jobs are completed within ${seed.turnaround}. In-stock modular repairs are frequently finished the same day.`,
    },
    {
      question: "When should I replace rather than repair?",
      answer: `Consider replacement when ${seed.replaceWhen}.`,
    },
    {
      question: "Does third-party repair void my manufacturer warranty?",
      answer:
        "Under Right to Repair laws in many jurisdictions, third-party repairs do not void manufacturer warranties unless the repair itself directly causes damage to other components.",
    },
    {
      question: "Do I need to book an appointment in advance?",
      answer:
        "While many shops accept walk-ins, calling ahead or booking online ensures replacement parts are reserved and technician bench time is scheduled immediately.",
    },
  ];

  if (primary) {
    items.splice(1, 0, {
      question: `How is '${primary.symptom}' fixed?`,
      answer: `${primary.cause} ${primary.fix} Expect typical costs around ${primary.cost} with turnaround of ${primary.time}.`,
    });
  }

  return items;
}

