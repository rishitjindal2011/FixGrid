/**
 * Catalogue parity check.
 *
 * `messages/en.json` is the shape of record. Every other locale must have the
 * exact same set of keys, to the leaf, and no extras.
 *
 * Why this matters even though `src/i18n/request.ts` falls back to English key
 * by key: the fallback makes a missing translation *invisible*. A Hindi page
 * with three English sentences in the middle of it renders without an error and
 * ships. This is the only thing that will tell you.
 *
 * Extra keys are reported too. They are almost always a rename that only landed
 * in one file, or a string a component stopped reading — either way, work a
 * translator would spend time on for nothing.
 *
 * Exits non-zero on any mismatch so it can gate a commit.
 */
import { readFile } from "node:fs/promises";

const LOCALES = ["hi", "bn", "mr", "te", "ta", "kn"];

/** Flatten to dotted leaf paths, so `expert.inventory.ask` is one entry. */
function leaves(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    leaves(child, prefix ? `${prefix}.${key}` : key),
  );
}

async function load(locale) {
  const path = new URL(`../messages/${locale}.json`, import.meta.url);
  return JSON.parse(await readFile(path, "utf8"));
}

const en = new Set(leaves(await load("en")));
let failed = false;

console.log(`en: ${en.size} keys`);

for (const locale of LOCALES) {
  const keys = new Set(leaves(await load(locale)));

  const missing = [...en].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !en.has(key));

  if (missing.length === 0 && extra.length === 0) {
    console.log(`${locale}: ok (${keys.size})`);
    continue;
  }

  failed = true;
  console.log(`${locale}: ${missing.length} missing, ${extra.length} extra`);
  for (const key of missing) console.log(`  - ${key}`);
  for (const key of extra) console.log(`  + ${key}`);
}

if (failed) process.exit(1);
console.log("\nAll seven catalogues agree.");
