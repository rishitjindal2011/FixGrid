import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function check() {
  const tables = ['seo_pages', 'cms_templates', 'blog_posts']; // Add any other content tables
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error);
      continue;
    }
    
    for (const row of data) {
      const jsonStr = JSON.stringify(row);
      if (jsonStr && jsonStr.includes('WHAT PEOPLE TOLD US')) {
         console.log(`Found on ${table} ID: ${row.id}`);
      }
    }
  }
}

check();
