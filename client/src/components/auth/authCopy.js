import { useLang } from "../../lib/lang";
import { friendlyError } from "../../lib/errors";

const COPY = {
  en: {
    language: "Choose language", switchToBangla: "Switch to Bangla", switchToEnglish: "Switch to English", showPassword: "Show password", hidePassword: "Hide password",
    signInTitle: "Welcome back", signInSub: "Sign in to check road reports and your saved reports.", continueToMap: "Sign in to continue to your map.",
    email: "Email", emailHint: "you@example.com", password: "Password", passwordHint: "Enter your password",
    forgot: "Forgot password?", signIn: "Sign in", continueWith: "or continue with", googleSignIn: "Continue with Google",
    newTo: "New to Safeway?", createAccount: "Create an account", signUpTitle: "Create your account",
    signUpSub: "Create an account to use the safety map and report road conditions.", fullName: "Full name",
    nameHint: "Your name", passwordHintNew: "At least 8 characters", confirmPassword: "Confirm password",
    confirmHint: "Enter your password again", consent: "I agree to the Privacy Policy and Terms and Conditions.",
    googleSignUp: "Sign up with Google", signUpAction: "Create account", alreadyHaveAccount: "Already have an account?",
    errorEmail: "Enter a valid email address.", errorPassword: "Password must be at least 8 characters.",
    errorName: "Enter your full name.", errorConfirm: "Passwords do not match.",
    errorConsent: "Accept the Privacy Policy and Terms to continue.", rateLimit: "Too many attempts. Try again in {seconds}s.",
    signInFailed: "Could not sign in. Please try again.", signUpFailed: "Could not create your account. Please try again.",
    accountCreated: "Your account was created, but we couldn't sign you in. Please sign in below.",
    existingAccount: "This email already has an account — it may have been created with Google. Use “Sign up with Google”, or reset your password from the Login page.",
    wrongCredentials: "Wrong email or password. Check your details and try again.",
    invalidEmail: "That email address doesn't look right. Check it and try again.",
    offline: "You're offline. Check your connection and try again.",
    attemptsLocked: "Too many attempts. Try again in {seconds}s.", waitSeconds: "Wait {seconds}s",
  },
  bn: {
    language: "ভাষা নির্বাচন করুন", switchToBangla: "বাংলায় পরিবর্তন করুন", switchToEnglish: "ইংরেজিতে পরিবর্তন করুন", showPassword: "পাসওয়ার্ড দেখুন", hidePassword: "পাসওয়ার্ড লুকান",
    signInTitle: "আবার স্বাগতম", signInSub: "সড়কের রিপোর্ট ও আপনার সংরক্ষিত রিপোর্ট দেখতে লগইন করুন।", continueToMap: "মানচিত্র দেখতে লগইন করুন।",
    email: "ইমেইল", emailHint: "you@example.com", password: "পাসওয়ার্ড", passwordHint: "পাসওয়ার্ড লিখুন",
    forgot: "পাসওয়ার্ড ভুলে গেছেন?", signIn: "লগইন", continueWith: "অথবা ব্যবহার করুন", googleSignIn: "Google দিয়ে লগইন",
    newTo: "Safeway-এ নতুন?", createAccount: "অ্যাকাউন্ট খুলুন", signUpTitle: "আপনার অ্যাকাউন্ট খুলুন",
    signUpSub: "নিরাপত্তা মানচিত্র ব্যবহার ও সড়কের অবস্থা জানাতে অ্যাকাউন্ট খুলুন।", fullName: "পুরো নাম",
    nameHint: "আপনার নাম", passwordHintNew: "কমপক্ষে ৮ অক্ষর", confirmPassword: "পাসওয়ার্ড নিশ্চিত করুন",
    confirmHint: "আবার পাসওয়ার্ড লিখুন", consent: "আমি গোপনীয়তা নীতি ও শর্তাবলিতে সম্মত।",
    googleSignUp: "Google দিয়ে সাইন আপ", signUpAction: "অ্যাকাউন্ট খুলুন", alreadyHaveAccount: "আগেই অ্যাকাউন্ট আছে?",
    errorEmail: "সঠিক ইমেইল ঠিকানা লিখুন।", errorPassword: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।",
    errorName: "আপনার পুরো নাম লিখুন।", errorConfirm: "পাসওয়ার্ড দুটি মিলছে না।",
    errorConsent: "এগিয়ে যেতে গোপনীয়তা নীতি ও শর্তাবলিতে সম্মতি দিন।",
    signInFailed: "লগইন করা যায়নি। আবার চেষ্টা করুন।", signUpFailed: "অ্যাকাউন্ট খোলা যায়নি। আবার চেষ্টা করুন।",
    accountCreated: "অ্যাকাউন্ট খোলা হয়েছে, তবে লগইন করা যায়নি। নিচে লগইন করুন।",
    existingAccount: "এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। Google দিয়ে সাইন আপ করুন অথবা লগইন পেজ থেকে পাসওয়ার্ড রিসেট করুন।",
    wrongCredentials: "ইমেইল বা পাসওয়ার্ড সঠিক নয়। তথ্য যাচাই করে আবার চেষ্টা করুন।",
    invalidEmail: "ইমেইল ঠিকানাটি সঠিক মনে হচ্ছে না। যাচাই করে আবার লিখুন।",
    offline: "ইন্টারনেট সংযোগ নেই। সংযোগ যাচাই করে আবার চেষ্টা করুন।",
    attemptsLocked: "অনেকবার চেষ্টা হয়েছে। {seconds} সেকেন্ড পর আবার চেষ্টা করুন।", waitSeconds: "অপেক্ষা করুন {seconds} সেকেন্ড",
  },
};

export function useAuthCopy() {
  const [lang, setLang] = useLang();
  return { lang, setLang, t: COPY[lang] || COPY.en };
}

export function authError(error, fallback, t, lang) {
  const message = friendlyError(error, fallback);
  if (lang !== "bn") return message;
  if (/wrong email or password/i.test(message)) return t.wrongCredentials;
  if (/doesn't look right|valid email/i.test(message)) return t.invalidEmail;
  if (/offline|connection/i.test(message)) return t.offline;
  if (message === fallback) return fallback;
  return fallback;
}
