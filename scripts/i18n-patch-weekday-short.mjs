/**
 * One-shot catalogue patch: adds `status.weekdayShort.*`.
 *
 * The opening-hours table in the contact card used to render
 * `WEEKDAY_LABELS[day].slice(0, 3)` — fine for "Monday" → "Mon", ruinous for
 * "ಸೋಮವಾರ", where the first three UTF-16 units cut through a conjunct and leave a
 * dangling vowel sign. Abbreviations are a per-language editorial decision, not a
 * substring operation, so they live in the catalogue.
 *
 * Run with `node scripts/i18n-patch-weekday-short.mjs`. Idempotent.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SHORT = {
  en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  hi: { mon: "सोम", tue: "मंगल", wed: "बुध", thu: "गुरु", fri: "शुक्र", sat: "शनि", sun: "रवि" },
  bn: { mon: "সোম", tue: "মঙ্গল", wed: "বুধ", thu: "বৃহ", fri: "শুক্র", sat: "শনি", sun: "রবি" },
  mr: { mon: "सोम", tue: "मंगळ", wed: "बुध", thu: "गुरु", fri: "शुक्र", sat: "शनि", sun: "रवि" },
  te: { mon: "సోమ", tue: "మంగళ", wed: "బుధ", thu: "గురు", fri: "శుక్ర", sat: "శని", sun: "ఆది" },
  ta: { mon: "திங்", tue: "செவ்", wed: "புத", thu: "வியா", fri: "வெள்", sat: "சனி", sun: "ஞாயி" },
  kn: { mon: "ಸೋಮ", tue: "ಮಂಗಳ", wed: "ಬುಧ", thu: "ಗುರು", fri: "ಶುಕ್ರ", sat: "ಶನಿ", sun: "ಭಾನು" },
};

for (const [locale, weekdayShort] of Object.entries(SHORT)) {
  const path = `messages/${locale}.json`;
  const messages = JSON.parse(readFileSync(path, "utf8"));
  messages.status.weekdayShort = weekdayShort;
  writeFileSync(path, `${JSON.stringify(messages, null, 2)}\n`);
  console.log(`${locale} ok`);
}
