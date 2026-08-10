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

const fixtures = JSON.parse(fs.readFileSync("probe-fixtures.json", "utf8"));
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: auth, error: authError } = await anon.auth.signInWithPassword({
  email: fixtures.email,
  password: fixtures.password,
});
if (authError) throw authError;
const uid = auth.user.id;

const booking = fixtures.bookings.find((b) => b.reference === "FIX-PROBE2");

// Mirrors openDispute exactly: the dispute row, then the booking status.
// `desired_outcome` is null here — the "Something else" path, which is the case
// that previously submitted an invalid enum value.
const { data: dispute, error: dErr } = await anon
  .from("disputes")
  .insert({
    booking_id: booking.id,
    raised_by: uid,
    status: "open",
    reason: "Screen has started flickering again two weeks after the repair, same fault as before.",
    desired_outcome: null,
  })
  .select("id, status, desired_outcome")
  .single();

console.log("dispute insert:", dErr ? `FAILED ${dErr.code} ${dErr.message}` : JSON.stringify(dispute));
if (dErr) process.exit(1);

const { error: sErr } = await anon.from("bookings").update({ status: "disputed" }).eq("id", booking.id);
console.log("booking -> disputed:", sErr ? `FAILED ${sErr.code} ${sErr.message}` : "ok");
if (sErr) {
  const { error } = await admin.from("bookings").update({ status: "disputed" }).eq("id", booking.id);
  console.log("  via admin:", error ? `FAILED ${error.message}` : "ok");
}

// A reply from the shop side, so the thread has both voices.
const { error: mErr } = await admin.from("dispute_messages").insert([
  {
    dispute_id: dispute.id,
    author_id: uid,
    author_role: "customer",
    body: "Photos attached. It flickers worst when the screen is cold.",
  },
  {
    dispute_id: dispute.id,
    author_id: null,
    author_role: "shop",
    body: "Sorry to hear that. Bring it in Thursday and we will replace the panel under warranty.",
  },
]);
console.log("messages:", mErr ? `FAILED ${mErr.message}` : "ok");

fs.writeFileSync("probe-dispute.json", JSON.stringify({ disputeId: dispute.id, bookingRef: booking.reference }, null, 2));
console.log("disputeId:", dispute.id);
