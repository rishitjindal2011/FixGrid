import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iusbwebxzrjwwfquscfp.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      jobId,
      fixerId,
      jobTitle,
      candidateId,
      candidateName,
      candidateEmail,
      candidatePhone,
      candidateWhatsapp,
      experienceYears,
      specialties = [],
      portfolioUrl,
      coverNote,
    } = body;

    if (!fixerId) {
      return NextResponse.json({ error: "Target workshop identifier is required." }, { status: 400 });
    }

    if (!candidateName || !candidatePhone) {
      return NextResponse.json({ error: "Candidate full name and phone number are required." }, { status: 400 });
    }

    const payloadDetails = {
      jobId,
      jobTitle: jobTitle || "Bench Opening",
      candidateName,
      candidateEmail: candidateEmail || null,
      candidatePhone,
      candidateWhatsapp: candidateWhatsapp || candidatePhone,
      experienceYears: experienceYears || "1-3 years",
      specialties,
      portfolioUrl: portfolioUrl || null,
      coverNote: coverNote || "Applied via hiring.vytron.me candidate portal.",
      status: "Pending Review",
    };

    const { data: inquiry, error: insertError } = await supabaseAdmin
      .from("inquiries")
      .insert({
        fixer_id: fixerId,
        customer_id: candidateId || null,
        symptom: "JOB_APPLICATION",
        brand: `Applicant: ${candidateName}`,
        model: jobTitle ? jobTitle.slice(0, 50) : "Bench Position",
        message: JSON.stringify(payloadDetails),
        status: "Pending",
        sub_status: "New Application",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert job application inquiry:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, inquiry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
