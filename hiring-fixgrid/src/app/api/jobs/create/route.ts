import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iusbwebxzrjwwfquscfp.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fixerId,
      title,
      jobType = "full_time",
      workLocation = "in_shop",
      experienceLevel = "any",
      salaryType = "negotiable",
      salaryMin,
      salaryMax,
      salaryPeriod = "month",
      salaryNegotiable = true,
      description,
      skillsRequired = [],
      contactPhone,
      contactWhatsapp,
      contactEmail,
    } = body;

    if (!fixerId) {
      return NextResponse.json({ error: "No active workshop associated with this account. Please register your workshop first." }, { status: 400 });
    }

    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
    }

    // Insert into shop_jobs
    const { data: job, error: insertError } = await supabaseAdmin
      .from("shop_jobs")
      .insert({
        fixer_id: fixerId,
        title: title.trim(),
        job_type: jobType,
        work_location: workLocation,
        experience_level: experienceLevel,
        salary_type: salaryType,
        salary_min: salaryMin ? parseInt(String(salaryMin), 10) : null,
        salary_max: salaryMax ? parseInt(String(salaryMax), 10) : null,
        salary_period: salaryPeriod,
        salary_negotiable: Boolean(salaryNegotiable),
        description: description.trim(),
        skills_required: Array.isArray(skillsRequired) ? skillsRequired : [],
        contact_phone: contactPhone || null,
        contact_whatsapp: contactWhatsapp || null,
        contact_email: contactEmail || null,
        is_active: true,
        sort_order: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert shop_jobs:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, job });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
