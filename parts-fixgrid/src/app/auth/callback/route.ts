import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  if (code) {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://iusbwebxzrjwwfquscfp.supabase.co";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1c2J3ZWJ4enJqd3dmcXVzY2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzEzNDUsImV4cCI6MjEwMDA0NzM0NX0.J7a2aVCo2oUoJj70LE9g7H4YNElJEz9XgovC4MY4hUE";

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect back to target
  return NextResponse.redirect(new URL(next, origin));
}
