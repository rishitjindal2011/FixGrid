import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
const env = {};
for (const raw of fs.readFileSync(".env.local","utf8").split("\n")) {
  const l = raw.trim();
  if (!l || l.startsWith("#") || !l.includes("=")) continue;
  const i = l.indexOf("=");
  let v = l.slice(i+1).trim();
  if ((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'"))) v = v.slice(1,-1);
  env[l.slice(0,i).trim()] = v;
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { disputeId } = JSON.parse(fs.readFileSync("probe-dispute.json","utf8"));
const { error } = await admin.from("disputes").update({
  status: "resolved",
  resolution: "refund_partial",
  resolution_note: "Panel replaced free of charge and 30% of the original fee returned.",
  refund_amount: 2670,
  resolved_at: new Date().toISOString(),
}).eq("id", disputeId);
console.log("resolve:", error ? `FAILED ${error.message}` : "ok");
