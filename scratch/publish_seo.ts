import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from("seo_pages")
    .update({ status: "published" })
    .eq("status", "draft");

  if (error) {
    console.error("Failed to publish pages:", error);
    process.exit(1);
  }

  console.log("Pages published successfully");
}

main();
