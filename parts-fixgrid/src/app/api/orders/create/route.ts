import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iusbwebxzrjwwfquscfp.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      buyerId,
      buyerName,
      buyerEmail,
      buyerPhone,
      deliveryAddress,
      fixerId,
      items = [],
      deliveryMode, // "home_delivery" or "in_shop"
      homeDeliverySupported = false,
      totalAmount,
      advancePaid = 0,
      balanceDue = 0,
      paymentStatus, // "Full Escrow Paid" | "Advance Reservation Token Paid"
    } = body;

    if (!fixerId) {
      return NextResponse.json({ error: "Seller workshop identifier is required." }, { status: 400 });
    }

    if (!buyerName || !buyerPhone) {
      return NextResponse.json({ error: "Buyer name and contact phone number are required." }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Cart cannot be empty." }, { status: 400 });
    }

    const orderReference = "ORD-" + Math.random().toString(36).substring(2, 7).toUpperCase();

    const orderPayload = {
      orderReference,
      buyerId,
      buyerName,
      buyerEmail: buyerEmail || null,
      buyerPhone,
      deliveryAddress: deliveryAddress || "In-Shop Counter Pickup",
      deliveryMode,
      homeDeliverySupported,
      items,
      totalAmount,
      advancePaid,
      balanceDue,
      paymentStatus,
      status: deliveryMode === "home_delivery" ? "Pending Dispatch" : "Ready for Pickup",
      orderDate: new Date().toISOString(),
    };

    // 1. Insert order record into inquiries
    const { data: inquiry, error: insertError } = await supabaseAdmin
      .from("inquiries")
      .insert({
        fixer_id: fixerId,
        customer_id: buyerId || null,
        symptom: "PARTS_ORDER",
        brand: `Order: ${buyerName}`,
        model: `${items.length} item(s) (${orderReference})`,
        delivery_mode: deliveryMode === "home_delivery" ? "Home Delivery" : "In-Shop",
        delivery_address: deliveryAddress || null,
        payment_status: paymentStatus,
        quoted_price: totalAmount,
        agreed_price: totalAmount,
        message: JSON.stringify(orderPayload),
        status: "Pending",
        sub_status: deliveryMode === "home_delivery" ? "Escrow Paid" : "Advance Paid",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to record parts order:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 2. Decrement inventory stock safely
    for (const item of items) {
      if (item.id) {
        try {
          const { data: currentItem } = await supabaseAdmin
            .from("shop_inventory")
            .select("quantity")
            .eq("id", item.id)
            .single();

          if (currentItem) {
            const updatedQty = Math.max(0, (currentItem.quantity || 0) - (item.quantity || 1));
            await supabaseAdmin
              .from("shop_inventory")
              .update({ quantity: updatedQty })
              .eq("id", item.id);
          }
        } catch (stockErr) {
          console.error("Failed to decrement inventory stock:", stockErr);
        }
      }
    }

    return NextResponse.json({ success: true, order: orderPayload, inquiryId: inquiry.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error processing order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
