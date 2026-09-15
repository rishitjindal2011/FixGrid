import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: shops } = await supabase
    .from("fixer_profiles")
    .select("id, slug")
    .in("slug", [
      "apex-microsoldering-lab",
      "silicon-bay-macbook-works",
      "voltcraft-appliance-solutions",
    ]);

  if (!shops || shops.length === 0) return;

  const shopMap = new Map(shops.map((s) => [s.slug, s.id]));

  const jobs = [
    {
      fixer_id: shopMap.get("apex-microsoldering-lab"),
      title: "Smartphone & Micro-Soldering Technician",
      job_type: "full_time",
      work_location: "in_shop",
      experience_level: "1-2 Years Experience",
      salary_type: "range",
      salary_min: 25000,
      salary_max: 35000,
      salary_period: "month",
      salary_negotiable: true,
      description: "Looking for a skilled technician for iPhone & Android screen replacements, charging port repairs, and SMD chip soldering. Clean workbench provided.",
      skills_required: ["Screen Replacement", "SMD Soldering", "Charging Port Repair", "Battery Replacement"],
      contact_phone: "+91 98101 23456",
      contact_whatsapp: "+91 98101 23456",
      is_active: true,
    },
    {
      fixer_id: shopMap.get("silicon-bay-macbook-works"),
      title: "Laptop Chip-Level Hardware Specialist",
      job_type: "full_time",
      work_location: "in_shop",
      experience_level: "2+ Years Experience",
      salary_type: "range",
      salary_min: 30000,
      salary_max: 45000,
      salary_period: "month",
      salary_negotiable: true,
      description: "Urgent opening for a motherboard repair specialist. Must have experience with BGA rework stations, thermal diagnostics, and schematic tracing.",
      skills_required: ["BGA Rework", "Motherboard Schematics", "Power Rail Diagnostics", "BIOS Programming"],
      contact_phone: "+91 98450 98765",
      contact_whatsapp: "+91 98450 98765",
      is_active: true,
    },
    {
      fixer_id: shopMap.get("voltcraft-appliance-solutions"),
      title: "Appliance Repair Apprentice / Trainee",
      job_type: "apprenticeship",
      work_location: "on_field",
      experience_level: "Fresher / Eager to Learn",
      salary_type: "range",
      salary_min: 12000,
      salary_max: 18000,
      salary_period: "month",
      salary_negotiable: true,
      description: "Hands-on training provided for washing machine, microwave, and refrigerator repairs. Valid 2-wheeler license required for field visits with senior technician.",
      skills_required: ["Basic Electrical Wiring", "Multimeter Use", "Appliance Assembly", "Customer Service"],
      contact_phone: "+91 98112 34567",
      contact_whatsapp: "+91 98112 34567",
      is_active: true,
    },
  ].filter((j) => j.fixer_id);

  const { error: jobErr } = await supabase.from("shop_jobs").insert(jobs);
  if (jobErr) console.error("Error inserting sample jobs:", jobErr);
  else console.log(`✓ Inserted ${jobs.length} sample jobs for hiring portal.`);
}

main();
