/**
 * One-shot catalogue patch: the shop-profile slice.
 *
 * Adds everything `/expert/[slug]` and its components need — the not-found page,
 * the photo carousel's labels, the public inventory's filter chrome and the whole
 * `reviews` namespace.
 *
 * Written as a script rather than seven hand-edits so the key SETS cannot drift:
 * one object per namespace, one entry per locale, and a mismatch is a missing
 * property rather than a JSON file somebody forgot to open.
 *
 * Run with `node scripts/i18n-patch-expert.mjs`. Idempotent.
 */
import { readFileSync, writeFileSync } from "node:fs";

const LOCALES = ["en", "hi", "bn", "mr", "te", "ta", "kn"];

/* ── expert.* additions ───────────────────────────────────────────────────── */

const EXPERT = {
  en: {
    notFoundEyebrow: "Not in the registry",
    notFoundHeading: "This shop isn't listed",
    notFoundBody:
      "The listing may have been removed, or the link may be out of date. Browse the directory to find another repair expert nearby.",
    browseExperts: "Browse repair experts",
    noPhotos: "No photos yet",
    photosOf: "Photos of {shopName}",
    photoAlt: "{shopName} — photo {index} of {count}",
    photoPosition: "Photo {index} of {count}",
    showPhoto: "Show photo {index}",
    previousPhoto: "Previous photo",
    nextPhoto: "Next photo",
  },
  hi: {
    notFoundEyebrow: "सूची में नहीं",
    notFoundHeading: "यह दुकान सूची में नहीं है",
    notFoundBody:
      "यह लिस्टिंग हटा दी गई हो सकती है, या लिंक पुराना हो सकता है। नज़दीक कोई दूसरी दुकान ढूँढने के लिए पूरी सूची देखें।",
    browseExperts: "मरम्मत की दुकानें देखें",
    noPhotos: "अभी कोई फ़ोटो नहीं",
    photosOf: "{shopName} की फ़ोटो",
    photoAlt: "{shopName} — फ़ोटो {index}/{count}",
    photoPosition: "फ़ोटो {index}, कुल {count} में से",
    showPhoto: "फ़ोटो {index} दिखाएँ",
    previousPhoto: "पिछली फ़ोटो",
    nextPhoto: "अगली फ़ोटो",
  },
  bn: {
    notFoundEyebrow: "তালিকায় নেই",
    notFoundHeading: "এই দোকান তালিকায় নেই",
    notFoundBody:
      "তালিকাটি সরিয়ে দেওয়া হয়ে থাকতে পারে, বা লিঙ্কটি পুরনো হতে পারে। কাছাকাছি অন্য দোকান খুঁজতে পুরো তালিকা দেখুন।",
    browseExperts: "মেরামতের দোকান দেখুন",
    noPhotos: "এখনও কোনো ছবি নেই",
    photosOf: "{shopName}-এর ছবি",
    photoAlt: "{shopName} — ছবি {index}/{count}",
    photoPosition: "ছবি {index}, মোট {count}টির মধ্যে",
    showPhoto: "ছবি {index} দেখান",
    previousPhoto: "আগের ছবি",
    nextPhoto: "পরের ছবি",
  },
  mr: {
    notFoundEyebrow: "यादीत नाही",
    notFoundHeading: "हे दुकान यादीत नाही",
    notFoundBody:
      "ही नोंद काढून टाकली असेल, किंवा दुवा जुना असेल. जवळचे दुसरे दुकान शोधण्यासाठी पूर्ण यादी पाहा.",
    browseExperts: "दुरुस्तीची दुकाने पाहा",
    noPhotos: "अजून फोटो नाहीत",
    photosOf: "{shopName} चे फोटो",
    photoAlt: "{shopName} — फोटो {index}/{count}",
    photoPosition: "फोटो {index}, एकूण {count} पैकी",
    showPhoto: "फोटो {index} दाखवा",
    previousPhoto: "मागील फोटो",
    nextPhoto: "पुढील फोटो",
  },
  te: {
    notFoundEyebrow: "జాబితాలో లేదు",
    notFoundHeading: "ఈ దుకాణం జాబితాలో లేదు",
    notFoundBody:
      "ఈ నమోదు తీసివేయబడి ఉండవచ్చు, లేదా లింక్ పాతబడి ఉండవచ్చు. దగ్గరలో మరో దుకాణం కోసం పూర్తి జాబితా చూడండి.",
    browseExperts: "మరమ్మతు దుకాణాలు చూడండి",
    noPhotos: "ఇంకా ఫోటోలు లేవు",
    photosOf: "{shopName} ఫోటోలు",
    photoAlt: "{shopName} — ఫోటో {index}/{count}",
    photoPosition: "ఫోటో {index}, మొత్తం {count}లో",
    showPhoto: "ఫోటో {index} చూపించండి",
    previousPhoto: "మునుపటి ఫోటో",
    nextPhoto: "తదుపరి ఫోటో",
  },
  ta: {
    notFoundEyebrow: "பட்டியலில் இல்லை",
    notFoundHeading: "இந்தக் கடை பட்டியலில் இல்லை",
    notFoundBody:
      "இந்தப் பட்டியல் நீக்கப்பட்டிருக்கலாம், அல்லது இணைப்பு பழையதாக இருக்கலாம். அருகில் வேறு கடையைத் தேட முழுப் பட்டியலைப் பாருங்கள்.",
    browseExperts: "பழுதுநீக்கும் கடைகளைப் பாருங்கள்",
    noPhotos: "இன்னும் புகைப்படங்கள் இல்லை",
    photosOf: "{shopName} புகைப்படங்கள்",
    photoAlt: "{shopName} — புகைப்படம் {index}/{count}",
    photoPosition: "புகைப்படம் {index}, மொத்தம் {count}இல்",
    showPhoto: "புகைப்படம் {index} காட்டு",
    previousPhoto: "முந்தைய புகைப்படம்",
    nextPhoto: "அடுத்த புகைப்படம்",
  },
  kn: {
    notFoundEyebrow: "ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲ",
    notFoundHeading: "ಈ ಅಂಗಡಿ ಪಟ್ಟಿಯಲ್ಲಿ ಇಲ್ಲ",
    notFoundBody:
      "ಈ ನಮೂದನ್ನು ತೆಗೆದಿರಬಹುದು, ಅಥವಾ ಕೊಂಡಿ ಹಳೆಯದಾಗಿರಬಹುದು. ಹತ್ತಿರದ ಬೇರೆ ಅಂಗಡಿಯನ್ನು ಹುಡುಕಲು ಪೂರ್ಣ ಪಟ್ಟಿಯನ್ನು ನೋಡಿ.",
    browseExperts: "ದುರಸ್ತಿ ಅಂಗಡಿಗಳನ್ನು ನೋಡಿ",
    noPhotos: "ಇನ್ನೂ ಫೋಟೋಗಳಿಲ್ಲ",
    photosOf: "{shopName} ಫೋಟೋಗಳು",
    photoAlt: "{shopName} — ಫೋಟೋ {index}/{count}",
    photoPosition: "ಫೋಟೋ {index}, ಒಟ್ಟು {count}ರಲ್ಲಿ",
    showPhoto: "ಫೋಟೋ {index} ತೋರಿಸಿ",
    previousPhoto: "ಹಿಂದಿನ ಫೋಟೋ",
    nextPhoto: "ಮುಂದಿನ ಫೋಟೋ",
  },
};

/* ── expert.inventory.* additions ─────────────────────────────────────────── */

const INVENTORY = {
  en: {
    shopTitle: "{shopName} shop",
    nothingListed: "This shop hasn't listed any items for sale yet.",
    found: "Found {shown} of {total} items",
    clearFilters: "Clear filters",
    ask: "Ask",
    conditionNew: "New",
    conditionRefurbished: "Refurbished",
    conditionUsed: "Used",
  },
  hi: {
    shopTitle: "{shopName} की दुकान",
    nothingListed: "इस दुकान ने अभी बिक्री के लिए कोई सामान नहीं डाला है।",
    found: "{total} में से {shown} सामान मिले",
    clearFilters: "फ़िल्टर हटाएँ",
    ask: "पूछें",
    conditionNew: "नया",
    conditionRefurbished: "रिफ़र्बिश्ड",
    conditionUsed: "इस्तेमाल किया हुआ",
  },
  bn: {
    shopTitle: "{shopName}-এর দোকান",
    nothingListed: "এই দোকান এখনও বিক্রির জন্য কোনো জিনিস দেয়নি।",
    found: "{total}টির মধ্যে {shown}টি জিনিস পাওয়া গেছে",
    clearFilters: "ফিল্টার সরান",
    ask: "জিজ্ঞাসা করুন",
    conditionNew: "নতুন",
    conditionRefurbished: "রিফার্বিশড",
    conditionUsed: "ব্যবহৃত",
  },
  mr: {
    shopTitle: "{shopName} चे दुकान",
    nothingListed: "या दुकानाने अजून विक्रीसाठी काही वस्तू टाकलेल्या नाहीत.",
    found: "{total} पैकी {shown} वस्तू मिळाल्या",
    clearFilters: "फिल्टर काढा",
    ask: "विचारा",
    conditionNew: "नवीन",
    conditionRefurbished: "रिफर्बिश्ड",
    conditionUsed: "वापरलेले",
  },
  te: {
    shopTitle: "{shopName} దుకాణం",
    nothingListed: "ఈ దుకాణం ఇంకా అమ్మకానికి ఏ వస్తువూ పెట్టలేదు.",
    found: "{total}లో {shown} వస్తువులు దొరికాయి",
    clearFilters: "ఫిల్టర్లు తీసేయండి",
    ask: "అడగండి",
    conditionNew: "కొత్తది",
    conditionRefurbished: "రిఫర్బిష్డ్",
    conditionUsed: "ఉపయోగించినది",
  },
  ta: {
    shopTitle: "{shopName} கடை",
    nothingListed: "இந்தக் கடை இன்னும் விற்பனைக்கு எந்தப் பொருளையும் பட்டியலிடவில்லை.",
    found: "{total}இல் {shown} பொருட்கள் கிடைத்தன",
    clearFilters: "வடிகட்டிகளை நீக்கு",
    ask: "கேளுங்கள்",
    conditionNew: "புதிது",
    conditionRefurbished: "புதுப்பிக்கப்பட்டது",
    conditionUsed: "பயன்படுத்தியது",
  },
  kn: {
    shopTitle: "{shopName} ಅಂಗಡಿ",
    nothingListed: "ಈ ಅಂಗಡಿ ಇನ್ನೂ ಮಾರಾಟಕ್ಕೆ ಯಾವ ವಸ್ತುವನ್ನೂ ಹಾಕಿಲ್ಲ.",
    found: "{total}ರಲ್ಲಿ {shown} ವಸ್ತುಗಳು ಸಿಕ್ಕಿವೆ",
    clearFilters: "ಫಿಲ್ಟರ್‌ಗಳನ್ನು ತೆಗೆಯಿರಿ",
    ask: "ಕೇಳಿ",
    conditionNew: "ಹೊಸದು",
    conditionRefurbished: "ನವೀಕರಿಸಿದ್ದು",
    conditionUsed: "ಬಳಸಿದ್ದು",
  },
};

/* ── reviews.* (new namespace) ────────────────────────────────────────────── */

const REVIEWS = {
  en: {
    noneYet: "No reviews yet",
    beFirst: "Used this shop? Write the first review and help the next person decide.",
    verifiedCustomer: "Verified customer",
    justNow: "just now",
    ownShop: "This is your shop, so you can't review it.",
    usedThisShop: "Used this shop?",
    signInPrompt: "Sign in to leave a review. It takes a minute.",
    signInCta: "Sign in to review",
    writeHeading: "Write a review",
    updateHeading: "Update your review",
    yourRating: "Your rating",
    starCount: "{count, plural, one {# star} other {# stars}}",
    whatHappened: "What happened?",
    optional: "(optional)",
    textPlaceholder: "What did they fix, how long did it take, and would you go back?",
    posting: "Posting…",
    post: "Post review",
    update: "Update review",
    success: "Thanks — your review is live.",
    ratingAria: "Rated {rating} out of 5 from {count, plural, one {# review} other {# reviews}}",
  },
  hi: {
    noneYet: "अभी कोई समीक्षा नहीं",
    beFirst: "इस दुकान से काम कराया है? पहली समीक्षा लिखें और अगले व्यक्ति की मदद करें।",
    verifiedCustomer: "सत्यापित ग्राहक",
    justNow: "अभी",
    ownShop: "यह आपकी दुकान है, इसलिए आप इसकी समीक्षा नहीं कर सकते।",
    usedThisShop: "इस दुकान से काम कराया है?",
    signInPrompt: "समीक्षा लिखने के लिए साइन इन करें। एक मिनट लगेगा।",
    signInCta: "समीक्षा के लिए साइन इन करें",
    writeHeading: "समीक्षा लिखें",
    updateHeading: "अपनी समीक्षा बदलें",
    yourRating: "आपकी रेटिंग",
    starCount: "{count, plural, one {# तारा} other {# तारे}}",
    whatHappened: "क्या हुआ?",
    optional: "(ज़रूरी नहीं)",
    textPlaceholder: "उन्होंने क्या ठीक किया, कितना समय लगा, और आप दोबारा जाएँगे?",
    posting: "भेजा जा रहा है…",
    post: "समीक्षा भेजें",
    update: "समीक्षा बदलें",
    success: "धन्यवाद — आपकी समीक्षा लाइव है।",
    ratingAria:
      "5 में से {rating}, {count, plural, one {# समीक्षा} other {# समीक्षाओं}} के आधार पर",
  },
  bn: {
    noneYet: "এখনও কোনো রিভিউ নেই",
    beFirst: "এই দোকানে কাজ করিয়েছেন? প্রথম রিভিউ লিখে পরের জনকে সাহায্য করুন।",
    verifiedCustomer: "যাচাই করা গ্রাহক",
    justNow: "এইমাত্র",
    ownShop: "এটি আপনার দোকান, তাই আপনি এর রিভিউ দিতে পারবেন না।",
    usedThisShop: "এই দোকানে কাজ করিয়েছেন?",
    signInPrompt: "রিভিউ দিতে সাইন ইন করুন। এক মিনিট লাগবে।",
    signInCta: "রিভিউ দিতে সাইন ইন করুন",
    writeHeading: "রিভিউ লিখুন",
    updateHeading: "আপনার রিভিউ বদলান",
    yourRating: "আপনার রেটিং",
    starCount: "{count, plural, one {# তারা} other {# তারা}}",
    whatHappened: "কী হয়েছিল?",
    optional: "(ঐচ্ছিক)",
    textPlaceholder: "তাঁরা কী সারালেন, কত সময় লাগল, আর আপনি আবার যাবেন?",
    posting: "পাঠানো হচ্ছে…",
    post: "রিভিউ পাঠান",
    update: "রিভিউ বদলান",
    success: "ধন্যবাদ — আপনার রিভিউ প্রকাশিত হয়েছে।",
    ratingAria:
      "5-এর মধ্যে {rating}, {count, plural, one {# রিভিউ} other {# রিভিউ}}-এর ভিত্তিতে",
  },
  mr: {
    noneYet: "अजून कोणताही अभिप्राय नाही",
    beFirst: "या दुकानात काम करून घेतले आहे? पहिला अभिप्राय लिहा आणि पुढच्या व्यक्तीला मदत करा.",
    verifiedCustomer: "पडताळलेला ग्राहक",
    justNow: "आत्ताच",
    ownShop: "हे तुमचे दुकान आहे, म्हणून तुम्ही त्याचा अभिप्राय देऊ शकत नाही.",
    usedThisShop: "या दुकानात काम करून घेतले आहे?",
    signInPrompt: "अभिप्राय देण्यासाठी साइन इन करा. एक मिनिट लागेल.",
    signInCta: "अभिप्रायासाठी साइन इन करा",
    writeHeading: "अभिप्राय लिहा",
    updateHeading: "तुमचा अभिप्राय बदला",
    yourRating: "तुमची रेटिंग",
    starCount: "{count, plural, one {# तारा} other {# तारे}}",
    whatHappened: "काय झाले?",
    optional: "(ऐच्छिक)",
    textPlaceholder: "त्यांनी काय दुरुस्त केले, किती वेळ लागला, आणि तुम्ही पुन्हा जाल?",
    posting: "पाठवत आहे…",
    post: "अभिप्राय पाठवा",
    update: "अभिप्राय बदला",
    success: "धन्यवाद — तुमचा अभिप्राय प्रकाशित झाला.",
    ratingAria:
      "5 पैकी {rating}, {count, plural, one {# अभिप्रायावर} other {# अभिप्रायांवर}} आधारित",
  },
  te: {
    noneYet: "ఇంకా సమీక్షలు లేవు",
    beFirst: "ఈ దుకాణంలో పని చేయించారా? మొదటి సమీక్ష రాసి తర్వాతి వ్యక్తికి సహాయం చేయండి.",
    verifiedCustomer: "ధృవీకరించిన కస్టమర్",
    justNow: "ఇప్పుడే",
    ownShop: "ఇది మీ దుకాణం, కాబట్టి మీరు దీనికి సమీక్ష ఇవ్వలేరు.",
    usedThisShop: "ఈ దుకాణంలో పని చేయించారా?",
    signInPrompt: "సమీక్ష రాయడానికి సైన్ ఇన్ చేయండి. ఒక నిమిషం పడుతుంది.",
    signInCta: "సమీక్ష కోసం సైన్ ఇన్ చేయండి",
    writeHeading: "సమీక్ష రాయండి",
    updateHeading: "మీ సమీక్షను మార్చండి",
    yourRating: "మీ రేటింగ్",
    starCount: "{count, plural, one {# నక్షత్రం} other {# నక్షత్రాలు}}",
    whatHappened: "ఏమి జరిగింది?",
    optional: "(ఐచ్ఛికం)",
    textPlaceholder: "వాళ్లు ఏమి బాగు చేశారు, ఎంత సమయం పట్టింది, మీరు మళ్లీ వెళ్తారా?",
    posting: "పంపుతోంది…",
    post: "సమీక్ష పంపండి",
    update: "సమీక్ష మార్చండి",
    success: "ధన్యవాదాలు — మీ సమీక్ష ప్రచురితమైంది.",
    ratingAria:
      "5లో {rating}, {count, plural, one {# సమీక్ష} other {# సమీక్షల}} ఆధారంగా",
  },
  ta: {
    noneYet: "இன்னும் மதிப்புரைகள் இல்லை",
    beFirst:
      "இந்தக் கடையில் வேலை செய்து கொண்டீர்களா? முதல் மதிப்புரையை எழுதி அடுத்தவருக்கு உதவுங்கள்.",
    verifiedCustomer: "சரிபார்க்கப்பட்ட வாடிக்கையாளர்",
    justNow: "இப்போதே",
    ownShop: "இது உங்கள் கடை, எனவே இதற்கு நீங்கள் மதிப்புரை எழுத முடியாது.",
    usedThisShop: "இந்தக் கடையில் வேலை செய்து கொண்டீர்களா?",
    signInPrompt: "மதிப்புரை எழுத உள்நுழையுங்கள். ஒரு நிமிடம் ஆகும்.",
    signInCta: "மதிப்புரைக்கு உள்நுழையுங்கள்",
    writeHeading: "மதிப்புரை எழுதுங்கள்",
    updateHeading: "உங்கள் மதிப்புரையை மாற்றுங்கள்",
    yourRating: "உங்கள் மதிப்பீடு",
    starCount: "{count, plural, one {# நட்சத்திரம்} other {# நட்சத்திரங்கள்}}",
    whatHappened: "என்ன நடந்தது?",
    optional: "(விரும்பினால்)",
    textPlaceholder: "அவர்கள் எதைச் சரி செய்தார்கள், எவ்வளவு நேரம் ஆனது, மீண்டும் செல்வீர்களா?",
    posting: "அனுப்பப்படுகிறது…",
    post: "மதிப்புரையை அனுப்பு",
    update: "மதிப்புரையை மாற்று",
    success: "நன்றி — உங்கள் மதிப்புரை வெளியிடப்பட்டது.",
    ratingAria:
      "5இல் {rating}, {count, plural, one {# மதிப்புரை} other {# மதிப்புரைகள்}} அடிப்படையில்",
  },
  kn: {
    noneYet: "ಇನ್ನೂ ವಿಮರ್ಶೆಗಳಿಲ್ಲ",
    beFirst: "ಈ ಅಂಗಡಿಯಲ್ಲಿ ಕೆಲಸ ಮಾಡಿಸಿದ್ದೀರಾ? ಮೊದಲ ವಿಮರ್ಶೆ ಬರೆದು ಮುಂದಿನವರಿಗೆ ಸಹಾಯ ಮಾಡಿ.",
    verifiedCustomer: "ಪರಿಶೀಲಿಸಿದ ಗ್ರಾಹಕ",
    justNow: "ಈಗಷ್ಟೇ",
    ownShop: "ಇದು ನಿಮ್ಮ ಅಂಗಡಿ, ಆದ್ದರಿಂದ ನೀವು ಇದಕ್ಕೆ ವಿಮರ್ಶೆ ಬರೆಯಲು ಆಗುವುದಿಲ್ಲ.",
    usedThisShop: "ಈ ಅಂಗಡಿಯಲ್ಲಿ ಕೆಲಸ ಮಾಡಿಸಿದ್ದೀರಾ?",
    signInPrompt: "ವಿಮರ್ಶೆ ಬರೆಯಲು ಸೈನ್ ಇನ್ ಮಾಡಿ. ಒಂದು ನಿಮಿಷ ಸಾಕು.",
    signInCta: "ವಿಮರ್ಶೆಗಾಗಿ ಸೈನ್ ಇನ್ ಮಾಡಿ",
    writeHeading: "ವಿಮರ್ಶೆ ಬರೆಯಿರಿ",
    updateHeading: "ನಿಮ್ಮ ವಿಮರ್ಶೆಯನ್ನು ಬದಲಿಸಿ",
    yourRating: "ನಿಮ್ಮ ರೇಟಿಂಗ್",
    starCount: "{count, plural, one {# ನಕ್ಷತ್ರ} other {# ನಕ್ಷತ್ರಗಳು}}",
    whatHappened: "ಏನಾಯಿತು?",
    optional: "(ಇಷ್ಟವಿದ್ದರೆ)",
    textPlaceholder: "ಅವರು ಏನನ್ನು ಸರಿ ಮಾಡಿದರು, ಎಷ್ಟು ಸಮಯ ಆಯಿತು, ಮತ್ತೆ ಹೋಗುತ್ತೀರಾ?",
    posting: "ಕಳುಹಿಸುತ್ತಿದೆ…",
    post: "ವಿಮರ್ಶೆ ಕಳುಹಿಸಿ",
    update: "ವಿಮರ್ಶೆ ಬದಲಿಸಿ",
    success: "ಧನ್ಯವಾದ — ನಿಮ್ಮ ವಿಮರ್ಶೆ ಪ್ರಕಟವಾಗಿದೆ.",
    ratingAria:
      "5ರಲ್ಲಿ {rating}, {count, plural, one {# ವಿಮರ್ಶೆ} other {# ವಿಮರ್ಶೆಗಳ}} ಆಧಾರದ ಮೇಲೆ",
  },
};

for (const locale of LOCALES) {
  const path = `messages/${locale}.json`;
  const messages = JSON.parse(readFileSync(path, "utf8"));

  Object.assign(messages.expert, EXPERT[locale]);
  Object.assign(messages.expert.inventory, INVENTORY[locale]);
  messages.reviews = { ...messages.reviews, ...REVIEWS[locale] };

  writeFileSync(path, `${JSON.stringify(messages, null, 2)}\n`);
  console.log(`${locale} ok`);
}
