import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = {};
for (const raw of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const line = raw.trim();
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[line.slice(0, i).trim()] = v;
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const EMAIL = "warranty-probe@example.com";
const PASSWORD = "Probe-Warranty-12345";

// Reuse the probe user across runs.
const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 });
let user = list?.users?.find((u) => u.email === EMAIL);

if (!user) {
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  user = data.user;
}
console.log("user:", user.id);

const fixerId = "11111111-1111-1111-1111-111111111111";
const serviceId = "22222222-2222-2222-2222-222222222222";

const { data: existingFixer } = await admin
  .from("fixer_profiles")
  .select("id, slug, shop_name")
  .limit(1);

let shop = existingFixer?.[0];
if (!shop) {
  const { data, error } = await admin
    .from("fixer_profiles")
    .insert({
      id: fixerId,
      slug: "probe-repairs",
      shop_name: "Probe Repairs",
      address: "1 Bench Street, London",
      verified: true,
    })
    .select("id, slug, shop_name")
    .single();
  if (error) throw error;
  shop = data;
}
console.log("shop:", shop.id, shop.shop_name);

const { data: svc } = await admin
  .from("shop_services")
  .select("id, name")
  .eq("fixer_id", shop.id)
  .limit(1);

let service = svc?.[0];
if (!service) {
  const { data, error } = await admin
    .from("shop_services")
    .insert({
      id: serviceId,
      fixer_id: shop.id,
      name: "Screen replacement",
      duration_minutes: 60,
      price_type: "fixed",
      price_min: 8900,
      warranty_days: 90,
    })
    .select("id, name")
    .single();
  if (error) throw error;
  service = data;
}
console.log("service:", service.id, service.name);

const now = Date.now();
const day = 86400000;

function slot(startOffset) {
  const s = new Date(now + startOffset);
  const e = new Date(s.getTime() + 3600000);
  return `[${s.toISOString()},${e.toISOString()})`;
}

// Three warranties: healthy, expiring inside 7 days (signal), and lapsed.
const rows = [
  { ref: "FIX-PROBE1", status: "completed", warranty: now + 60 * day, completed: now - 30 * day },
  { ref: "FIX-PROBE2", status: "completed", warranty: now + 3 * day, completed: now - 87 * day },
  { ref: "FIX-PROBE3", status: "closed", warranty: now - 5 * day, completed: now - 95 * day },
];

await admin.from("bookings").delete().eq("customer_id", user.id);

const inserted = [];
for (const r of rows) {
  const { data, error } = await admin
    .from("bookings")
    .insert({
      reference: r.ref,
      customer_id: user.id,
      fixer_id: shop.id,
      service_id: service.id,
      status: r.status,
      delivery_mode: "in_shop",
      slot: slot(-90 * day),
      device_details: "iPhone 13, cracked screen",
      quoted_amount: 8900,
      final_amount: 8900,
      currency: "GBP",
      warranty_days: 90,
      warranty_expires_at: new Date(r.warranty).toISOString(),
      completed_at: new Date(r.completed).toISOString(),
    })
    .select("id, reference")
    .single();
  if (error) throw error;
  inserted.push(data);
  console.log("booking:", data.reference, data.id);
}

console.log(JSON.stringify({ email: EMAIL, password: PASSWORD, bookings: inserted }, null, 2));
fs.writeFileSync("probe-fixtures.json", JSON.stringify({ email: EMAIL, password: PASSWORD, bookings: inserted }, null, 2));
