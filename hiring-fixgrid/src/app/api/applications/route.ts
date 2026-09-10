import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iusbwebxzrjwwfquscfp.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fixerId = searchParams.get("fixerId");

    if (!fixerId) {
      return NextResponse.json({ error: "Missing fixerId parameter" }, { status: 400 });
    }

    const { data: applications, error } = await supabaseAdmin
      .from("inquiries")
      .select("*")
      .eq("fixer_id", fixerId)
      .eq("symptom", "JOB_APPLICATION")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (applications || []).map((row) => {
      let parsed = {};
      try {
        parsed = JSON.parse(row.message || "{}");
      } catch {
        parsed = {};
      }
      return {
        id: row.id,
        fixer_id: row.fixer_id,
        created_at: row.created_at,
        status: row.status,
        sub_status: row.sub_status,
        ...parsed,
      };
    });

    return NextResponse.json({ applications: formatted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
