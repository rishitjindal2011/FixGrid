import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iusbwebxzrjwwfquscfp.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1c2J3ZWJ4enJqd3dmcXVzY2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzEzNDUsImV4cCI6MjEwMDA0NzM0NX0.J7a2aVCo2oUoJj70LE9g7H4YNElJEz9XgovC4MY4hUE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ShopJob {
  id: string;
  fixer_id: string;
  title: string;
  job_type: "full_time" | "part_time" | "contract" | "apprenticeship";
  work_location: "in_shop" | "on_field" | "hybrid";
  experience_level: string;
  salary_type: "fixed" | "range" | "negotiable" | "commission";
  salary_min: number | null;
  salary_max: number | null;
  salary_period: "month" | "week" | "day" | "per_job";
  salary_negotiable: boolean;
  description: string;
  skills_required: string[];
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  fixer_profiles?: {
    shop_name: string;
    slug: string;
    address: string;
    verified: boolean;
    rating_avg: number;
    rating_count: number;
  } | null;
}

export async function getActiveJobs(): Promise<ShopJob[]> {
  try {
    const { data: jobs, error } = await supabase
      .from("shop_jobs")
      .select("*, fixer_profiles(shop_name, slug, address, verified, rating_avg, rating_count)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load jobs from Supabase:", error);
      return [];
    }

    return (jobs as unknown as ShopJob[]) || [];
  } catch (err) {
    console.error("Error in getActiveJobs:", err);
    return [];
  }
}
