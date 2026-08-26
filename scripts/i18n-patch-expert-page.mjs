/**
 * Finishes the shop-profile slice in the catalogues.
 *
 * Three jobs, all bookkeeping:
 *
 *   1. Adds the keys `/expert/[slug]/page.tsx` needs — the meta-description
 *      fallback and the two JSON-LD breadcrumb names. Breadcrumbs are
 *      translated because Google renders them in results in the page's own
 *      language; leaving them English under a Tamil page is a mismatch.
 *
 *   2. Deletes `expert.noReviews`, `expert.usedThisShop` and
 *      `expert.verifiedCustomer`. All three were superseded by the `reviews`
 *      namespace and nothing reads them any more (grep-verified). A dead key in
 *      a catalogue costs a translator real time on a string nobody will see.
 *
 *   3. Deletes `expert.inventory.allCategories` in favour of the existing
 *      `common.allCategories`, which `search/filter-panel.tsx` already uses for
 *      the identical affordance — a category select's reset option. One string,
 *      one entry, seven fewer duplicates to keep in agreement.
 */
import { readFile, writeFile } from "node:fs/promises";

const ADD = {
  metaDescription: {
    en: "{shopName} is a repair shop at {address}. See opening hours, services and reviews.",
    hi: "{shopName} {address} पर स्थित एक मरम्मत की दुकान है। खुलने का समय, सेवाएँ और समीक्षाएँ देखें।",
    bn: "{shopName} {address}-এ অবস্থিত একটি মেরামতের দোকান। খোলার সময়, পরিষেবা ও রিভিউ দেখুন।",
    mr: "{shopName} हे {address} येथील दुरुस्तीचे दुकान आहे. उघडण्याची वेळ, सेवा आणि परीक्षणे पाहा.",
    te: "{shopName} అనేది {address}లో ఉన్న ఒక రిపేర్ షాప్. తెరిచే సమయాలు, సేవలు మరియు సమీక్షలు చూడండి.",
    ta: "{shopName} என்பது {address} இல் உள்ள ஒரு பழுதுநீக்கும் கடை. திறக்கும் நேரம், சேவைகள் மற்றும் கருத்துகளைப் பாருங்கள்.",
    kn: "{shopName} ಎಂಬುದು {address} ನಲ್ಲಿರುವ ದುರಸ್ತಿ ಅಂಗಡಿ. ತೆರೆಯುವ ಸಮಯ, ಸೇವೆಗಳು ಮತ್ತು ವಿಮರ್ಶೆಗಳನ್ನು ನೋಡಿ.",
  },
  breadcrumbHome: {
    en: "Home",
    hi: "होम",
    bn: "হোম",
    mr: "होम",
    te: "హోమ్",
    ta: "முகப்பு",
    kn: "ಮುಖಪುಟ",
  },
  breadcrumbExperts: {
    en: "Experts",
    hi: "विशेषज्ञ",
    bn: "বিশেষজ্ঞ",
    mr: "तज्ज्ञ",
    te: "నిపుణులు",
    ta: "நிபுணர்கள்",
    kn: "ಪರಿಣತರು",
  },
};

const DROP_EXPERT = ["noReviews", "usedThisShop", "verifiedCustomer"];
const DROP_INVENTORY = ["allCategories"];

const LOCALES = ["en", "hi", "bn", "mr", "te", "ta", "kn"];

for (const locale of LOCALES) {
  const path = new URL(`../messages/${locale}.json`, import.meta.url);
  const messages = JSON.parse(await readFile(path, "utf8"));

  messages.expert ??= {};

  for (const [key, byLocale] of Object.entries(ADD)) {
    const value = byLocale[locale];
    if (!value) throw new Error(`${key} has no ${locale} translation`);
    messages.expert[key] = value;
  }

  for (const key of DROP_EXPERT) delete messages.expert[key];
  if (messages.expert.inventory) {
    for (const key of DROP_INVENTORY) delete messages.expert.inventory[key];
  }

  await writeFile(path, `${JSON.stringify(messages, null, 2)}\n`, "utf8");
  console.log(`${locale} ok`);
}
