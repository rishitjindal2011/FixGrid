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

const { data, error } = await anon.auth.signInWithPassword({
  email: fixtures.email,
  password: fixtures.password,
});
if (error) throw error;

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const name = `sb-${ref}-auth-token`;

// @supabase/ssr 0.8 stores the whole session as base64- prefixed JSON,
// chunked at 3180 chars.
const payload = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64");

const CHUNK = 3180;
const parts = [];
if (payload.length <= CHUNK) {
  parts.push([name, payload]);
} else {
  for (let i = 0, n = 0; i < payload.length; i += CHUNK, n++) {
    parts.push([`${name}.${n}`, payload.slice(i, i + CHUNK)]);
  }
}

fs.writeFileSync("probe-cookie.txt", parts.map(([k, v]) => `${k}=${v}`).join("; "));
console.log("cookie parts:", parts.length, "user:", data.user.id);
