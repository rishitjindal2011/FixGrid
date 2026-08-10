import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Missing Supabase credentials in environment");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  const { data: allPages, error: getError } = await supabase
    .from("seo_pages")
    .select("id, slug");

  if (getError) {
    console.error("Error fetching pages:", getError);
    return;
  }

  const validSlugs = ["phones", "laptops", "appliances", "bicycles", "watches"];
  
  for (const page of allPages) {
    if (!validSlugs.includes(page.slug)) {
      console.log(`Deleting invalid page: ${page.slug}`);
      await supabase.from("seo_pages").delete().eq("id", page.id);
    }
  }
}

run();
