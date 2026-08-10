import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from("seo_pages")
    .select("slug, content_sections, meta_title")
    .eq("path_prefix", "repair")
    .limit(1);

  if (error) {
    console.error("Error fetching SEO pages:", error);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log("Slug:", data[0].slug);
    console.log("Content Sections:", JSON.stringify(data[0].content_sections, null, 2));
  } else {
    console.log("No SEO pages found.");
  }
}

main();
