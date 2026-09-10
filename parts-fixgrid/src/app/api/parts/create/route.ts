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
      name,
      sku,
      brand,
      condition = "new",
      priceInRupees,
      quantity = 1,
      lowStockThreshold = 2,
      description,
    } = body;

    if (!fixerId) {
      return NextResponse.json({ error: "No active workshop associated with this account. Please sign in or register your workshop." }, { status: 400 });
    }

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Part name is required." }, { status: 400 });
    }

    const pricePaise = priceInRupees ? Math.round(parseFloat(priceInRupees) * 100) : null;
    const qty = parseInt(String(quantity), 10) || 1;
    const lowStock = parseInt(String(lowStockThreshold), 10) || 2;

    const { data: item, error: insertError } = await supabaseAdmin
      .from("shop_inventory")
      .insert({
        fixer_id: fixerId,
        name: name.trim(),
        sku: sku ? sku.trim() : null,
        brand: brand ? brand.trim() : null,
        condition: condition,
        unit_price: pricePaise,
        currency: "INR",
        quantity: qty,
        low_stock_threshold: lowStock,
        description: description ? description.trim() : null,
        is_active: true,
        sort_order: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert shop_inventory:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
