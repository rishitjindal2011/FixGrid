import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iusbwebxzrjwwfquscfp.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, shopName, slug, address, contactPhone } = body;

    if (!userId || !shopName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if workshop already exists for this user
    const { data: existing } = await supabaseAdmin
      .from("fixer_profiles")
      .select("id, shop_name, slug, address, verified, owner_id")
      .eq("owner_id", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ workshop: existing });
    }

    // Insert new workshop
    const cleanSlug = (slug || shopName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Math.random().toString(36).substring(2, 6);

    const { data: newShop, error: insertError } = await supabaseAdmin
      .from("fixer_profiles")
      .insert({
        owner_id: userId,
        user_id: userId,
        shop_name: shopName,
        slug: cleanSlug,
        address: address || "Hardware Reclamation & Bench Depot",
        contact_phone: contactPhone || null,
        verified: true,
        is_hidden: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating workshop in fixer_profiles:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ workshop: newShop });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
