// Maps technical errors to plain sentences for the UI.
// Real errors are logged to the console; users only ever see these strings.
const RULES = [
  [/invalid.?credentials|wrong.*password/i, {
    en: "Wrong email or password. Check your details and try again.",
    bn: "ইমেইল বা পাসওয়ার্ড সঠিক নয়। তথ্য যাচাই করে আবার চেষ্টা করুন।",
  }],
  [/(already exists|already_exists)/i, {
    en: "An account with this email already exists. Try signing in instead.",
    bn: "এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। বরং লগইন করার চেষ্টা করুন।",
  }],
  [/password.*(short|enough|less)|at least.*characters|too short/i, {
    en: "Your password is too short. Use at least 8 characters.",
    bn: "পাসওয়ার্ডটি খুব ছোট। কমপক্ষে ৮ অক্ষর ব্যবহার করুন।",
  }],
  [/password.*(at most|max|too long|256)/i, {
    en: "That password is too long. Please use a shorter one.",
    bn: "পাসওয়ার্ডটি খুব বড়। ছোট একটি ব্যবহার করুন।",
  }],
  [/invalid\W{0,3}email|email.*invalid/i, {
    en: "That email address doesn't look right. Check it and try again.",
    bn: "ইমেইল ঠিকানাটি সঠিক মনে হচ্ছে না। যাচাই করে আবার লিখুন।",
  }],
  [/name.*(short|enough)/i, {
    en: "Please enter your full name.",
    bn: "আপনার পুরো নাম লিখুন।",
  }],
  [/name.*(at most|max|too long|128)/i, {
    en: "That name is too long. Please shorten it.",
    bn: "নামটি খুব বড়। ছোট করুন।",
  }],
  [/email.*(not.*confirm|unconfirm)/i, {
    en: "Please confirm your email first. Check your inbox for the verification link.",
    bn: "আগে আপনার ইমেইল নিশ্চিত করুন। ইনবক্সে যাচাইয়ের লিংক দেখুন।",
  }],
  [/already (verified|confirmed)/i, {
    en: "Your email is already confirmed.",
    bn: "আপনার ইমেইল আগেই নিশ্চিত করা হয়েছে।",
  }],
  [/rate.?limit|too many/i, {
    en: "Too many attempts. Please wait a little and try again.",
    bn: "অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন।",
  }],
  [/invalid origin|unknown_origin|web platform/i, {
    en: "Sign-in isn't available on this site yet. Please contact support.",
    bn: "এই সাইটে এখনো লগইন পাওয়া যায় না। সহায়তার সাথে যোগাযোগ করুন।",
  }],
  [/user_count_exceeded|maximum number of users/i, {
    en: "This app can't accept new accounts right now. Please try again later.",
    bn: "এই অ্যাপে এখন নতুন অ্যাকাউন্ট নেওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।",
  }],
  [/password_policy|password policy/i, {
    en: "Your password doesn't meet our requirements. Try a longer one with letters and numbers.",
    bn: "আপনার পাসওয়ার্ড আমাদের শর্ত পূরণ করে না। অক্ষর ও সংখ্যা মিশিয়ে বড় একটি পাসওয়ার্ড নিন।",
  }],
  [/session.*(expired|invalid)|unauthorized/i, {
    en: "Your session expired. Please sign in again.",
    bn: "আপনার সেশন শেষ হয়েছে। আবার লগইন করুন।",
  }],
  [/failed to fetch|network|offline/i, {
    en: "You're offline. Check your connection and try again.",
    bn: "আপনি অনলাইনে নেই। সংযোগ যাচাই করে আবার চেষ্টা করুন।",
  }],
];

const GENERIC = {
  en: "Something went wrong. Please try again.",
  bn: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।",
};

const SERVER_DOWN = {
  en: "The service is having trouble right now. Please try again in a moment.",
  bn: "সেবাটিতে এখন সমস্যা হচ্ছে। কিছুক্ষণ পর আবার চেষ্টা করুন।",
};

/**
 * Returns a plain, user-facing sentence for any error.
 * `fallback` overrides the generic final message (per-screen wording, already
 * translated by the caller). `lang` picks the language of the mapped sentences.
 */
export function friendlyError(err, fallback = GENERIC.en, lang = "en") {
  const L = lang === "bn" ? "bn" : "en";
  const generic = fallback ?? GENERIC[L];
  if (!err) return generic;
  const code = err?.code;
  const type = String(err?.type ?? "");
  const msg = String(err?.message ?? "");
  const haystack = `${code ?? ""} ${type} ${msg}`;
  for (const [pattern, sentences] of RULES) {
    if (pattern.test(haystack)) return sentences[L];
  }
  if (typeof code === "number" && code >= 500) {
    return SERVER_DOWN[L];
  }
  // Errors thrown by our own Functions (callFunction) have no code and
  // already carry plain sentences — show them as-is.
  if (code == null) return msg || generic;
  console.error("[friendlyError] unmapped error:", code, type, msg);
  return generic;
}
