// Maps technical errors to plain sentences for the UI.
// Real errors are logged to the console; users only ever see these strings.
const RULES = [
  [/invalid.?credentials|wrong.*password/i, "Wrong email or password. Check your details and try again."],
  [/(already exists|already_exists)/i, "An account with this email already exists. Try signing in instead."],
  [/password.*(short|enough|less)|at least.*characters|too short/i, "Your password is too short. Use at least 8 characters."],
  [/password.*(at most|max|too long|256)/i, "That password is too long. Please use a shorter one."],
  [/invalid\W{0,3}email|email.*invalid/i, "That email address doesn't look right. Check it and try again."],
  [/name.*(short|enough)/i, "Please enter your full name."],
  [/name.*(at most|max|too long|128)/i, "That name is too long. Please shorten it."],
  [/email.*(not.*confirm|unconfirm)/i, "Please confirm your email first. Check your inbox for the verification link."],
  [/already (verified|confirmed)/i, "Your email is already confirmed."],
  [/rate.?limit|too many/i, "Too many attempts. Please wait a little and try again."],
  [/invalid origin|unknown_origin|web platform/i, "Sign-in isn't available on this site yet. Please contact support."],
  [/user_count_exceeded|maximum number of users/i, "This app can't accept new accounts right now. Please try again later."],
  [/password_policy|password policy/i, "Your password doesn't meet our requirements. Try a longer one with letters and numbers."],
  [/session.*(expired|invalid)|unauthorized/i, "Your session expired. Please sign in again."],
  [/failed to fetch|network|offline/i, "You're offline. Check your connection and try again."],
];

/**
 * Returns a plain, user-facing sentence for any error.
 * `fallback` overrides the generic final message (per-screen wording).
 */
export function friendlyError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  const code = err?.code;
  const type = String(err?.type ?? "");
  const msg = String(err?.message ?? "");
  const haystack = `${code ?? ""} ${type} ${msg}`;
  for (const [pattern, sentence] of RULES) {
    if (pattern.test(haystack)) return sentence;
  }
  if (typeof code === "number" && code >= 500) {
    return "The service is having trouble right now. Please try again in a moment.";
  }
  // Errors thrown by our own Functions (callFunction) have no code and
  // already carry plain sentences — show them as-is.
  if (code == null) return msg || fallback;
  console.error("[friendlyError] unmapped error:", code, type, msg);
  return fallback;
}
