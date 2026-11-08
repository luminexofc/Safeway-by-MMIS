// Maps technical errors to plain sentences for the UI.
// Real errors are logged to the console; users only ever see these strings.
const RULES = [
  [/invalid.?credentials|wrong.*password/i, "Wrong email or password. Check your details and try again."],
  [/already_exists|already exist/i, "An account with this email already exists. Try signing in instead."],
  [/password.*(short|enough|less)|at least.*characters|too short/i, "Your password is too short. Use at least 8 characters."],
  [/invalid.?email|email.*invalid/i, "That email address doesn't look right. Check it and try again."],
  [/name.*(short|enough)/i, "Please enter your full name."],
  [/email.*(not.*confirm|unconfirm)/i, "Please confirm your email first. Check your inbox for the verification link."],
  [/already (verified|confirmed)/i, "Your email is already confirmed."],
  [/rate.?limit|too many/i, "Too many attempts. Please wait a little and try again."],
  [/session.*(expired|invalid)|unauthorized/i, "Your session expired. Please sign in again."],
  [/operator|member/i, "This account is not in the operators team."],
  [/failed to fetch|network|offline/i, "You're offline. Check your connection and try again."],
];

/**
 * Returns a plain, user-facing sentence for any error.
 * `fallback` overrides the generic final message (per-screen wording).
 */
export function friendlyError(err, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  const code = err?.code;
  const msg = String(err?.message ?? "");
  const haystack = `${code ?? ""} ${msg}`;
  for (const [pattern, sentence] of RULES) {
    if (pattern.test(haystack)) return sentence;
  }
  // Errors thrown by our own Functions (callFunction) have no code and
  // already carry plain sentences — show them as-is.
  if (code == null) return msg || fallback;
  console.error("[friendlyError] unmapped error:", code, msg);
  return fallback;
}
