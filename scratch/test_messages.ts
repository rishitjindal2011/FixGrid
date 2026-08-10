import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function main() {
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
  
  const ownerId = crypto.randomUUID();
  const customerId = crypto.randomUUID();
  const ownerEmail = `owner-${Date.now()}@test.com`;
  const customerEmail = `customer-${Date.now()}@test.com`;

  // Create users
  await adminClient.auth.admin.createUser({ id: ownerId, email: ownerEmail, email_confirm: true, password: "password123" });
  await adminClient.auth.admin.createUser({ id: customerId, email: customerEmail, email_confirm: true, password: "password123" });

  await adminClient.from("profiles").upsert({ id: ownerId, name: "Shop Owner" }).select().single();
  await adminClient.from("profiles").upsert({ id: customerId, name: "Customer" });

  // Create shop
  const { data: shop, error: shopErr } = await adminClient.from("fixer_profiles").insert({
    slug: `test-shop-${Date.now()}`,
    shop_name: "Test Shop",
    owner_id: ownerId
  }).select().single();
  if (shopErr) throw shopErr;

  // Create booking
  const { data: booking, error: bookErr } = await adminClient.from("bookings").insert({
    customer_id: customerId,
    fixer_id: shop.id,
    device_details: "Screen broken",
    slot: "[2026-08-11T10:00:00Z,2026-08-11T11:00:00Z]",
    status: "requested"
  }).select().single();
  if (bookErr) throw bookErr;

  const { data: thread } = await adminClient.from("message_threads").select().eq("booking_id", booking.id).single();
  
  const client = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await client.auth.signInWithPassword({ email: ownerEmail, password: "password123" });

  const client2 = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  await client2.auth.signInWithPassword({ email: customerEmail, password: "password123" });

  // TEST if policies exist on message_threads
  // If we can select the thread using client (Shop Owner), it means "parties read own threads" is active.
  const { data: threadsForShop } = await client.from("message_threads").select().eq("id", thread.id);
  console.log("Shop Owner read thread:", threadsForShop?.length);

  // Test messages insert
  const { data: adminInsert, error: adminInsertErr } = await adminClient.from("messages").insert({
    thread_id: thread.id,
    sender_id: ownerId,
    body: "Hello from admin",
  }).select().single();
  console.log("Admin insert:", adminInsert);

  const { data: messagesSelect } = await client.from("messages").select().eq("thread_id", thread.id);
  console.log("Shop owner SELECT messages length:", messagesSelect?.length);

  const { data, error } = await client.from("messages").insert({
    thread_id: thread.id,
    sender_id: ownerId,
    body: "Hello from shop owner",
  });
  console.log("Insert result (Shop Owner):", { error: error?.message || error?.details || error?.hint || error });

}

main().catch(console.error);
