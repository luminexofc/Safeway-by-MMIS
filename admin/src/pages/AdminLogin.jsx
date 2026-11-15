import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleAlert, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { cn } from "../../../shared/cn";
import ThemeToggle from "../components/ThemeToggle";
import { account } from "../lib/appwrite";
import { useOperator } from "../lib/operator";
import { friendlyError } from "../lib/errors";

const MAIN_SITE = import.meta.env.VITE_MAIN_SITE_URL || "http://localhost:5173";

// Deliberately loose: Appwrite owns the real email rules. This only catches
// obvious typos before a round trip.
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// DESIGN.md keeps road-condition red for road conditions, so a form error is
// marked with ink weight and a message, not a caution colour.
const inputClass = (invalid) =>
  cn(
    "min-h-[48px] w-full rounded-xl border bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted",
    invalid ? "border-ink" : "border-control"
  );

const fieldLabel = "block text-[13.5px] font-semibold text-ink";
const fieldError = "mt-1.5 text-[13px] font-semibold text-ink";
// Equal negative margin and padding grow the touch area to 44 px while
// leaving the line box untouched, so prose keeps its rhythm on phones.
const linkClass =
  "-my-3 inline-block py-3 font-semibold text-accent-strong underline underline-offset-2 hover:text-ink";

export default function AdminLogin() {
  const nav = useNavigate();
  const { refresh, logout } = useOperator();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const address = email.trim();
    const next = {};
    if (!EMAIL_RE.test(address)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";

    setFieldErrors(next);
    setError("");
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();

    setLoading(true);
    try {
      await account.createEmailPasswordSession({ email: address, password });
      // The provider mounted while signed out, so re-check before routing:
      // the guard needs the new session, not the stale signed-out state.
      const status = await refresh();

      if (status === "operator") {
        nav("/", { replace: true });
        return;
      }
      if (status === "rejected") {
        // A console session for a non-operator is useless here, and leaving it
        // behind would strand the next visitor on this browser. Drop it.
        await logout();
        setError(
          "That account is not in the operators team. Ask an admin to add it, or sign in with an operator account."
        );
      } else {
        setError(
          "Signed in, but this browser did not keep the session. Allow cookies for this site and try again."
        );
      }
      setLoading(false);
    } catch (ex) {
      console.error("[console-login] failed:", ex?.code ?? ex?.message ?? ex);
      setError(friendlyError(ex, "Could not sign in. Please try again."));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100svh] flex-col bg-paper">
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-solid text-solid-ink">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="mr-auto min-w-0">
            <p className="text-[16px] font-bold leading-tight">Safeway Console</p>
            <p className="text-[12.5px] text-muted">Report verification</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 sm:px-6">
        <section aria-labelledby="login-title" className="max-w-[26rem] pb-10 pt-10 sm:pt-14">
          <h1 id="login-title" className="text-[34px] leading-[1.12] tracking-[-0.035em] sm:text-[38px]">
            Operator sign-in
          </h1>
          <p className="mt-2.5 text-[14.5px] text-ink-2">
            Use the email and password of your operator account.
          </p>

          <form className="mt-8 space-y-5" onSubmit={submit} noValidate aria-busy={loading}>
            <div>
              <label htmlFor="operator-email" className={fieldLabel}>
                Operator email
              </label>
              <input
                id="operator-email"
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="operator@example.org"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "operator-email-error" : undefined}
                className={cn(inputClass(Boolean(fieldErrors.email)), "mt-1.5")}
              />
              {fieldErrors.email && (
                <p id="operator-email-error" className={fieldError}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="operator-password" className={fieldLabel}>
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="operator-password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "operator-password-error" : undefined}
                  className={cn(inputClass(Boolean(fieldErrors.password)), "pr-12")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="operator-password-error" className={fieldError}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rule-strong bg-surface px-3.5 py-3"
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-ink-2" aria-hidden="true" />
                <p className="text-[13.5px] font-semibold leading-snug text-ink">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="pressable inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded-xl bg-solid px-5 text-[15px] font-bold text-solid-ink hover:bg-solid-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in to the console"}
            </button>
          </form>

          <p className="mt-5 text-[13.5px] text-ink-2">
            Forgot your password?{" "}
            <a href={`${MAIN_SITE}/login`} className={linkClass}>
              Reset it in the Safeway app
            </a>
            .
          </p>
        </section>

        <section aria-labelledby="login-access-title" className="max-w-[33rem] border-t border-rule pb-14 pt-7">
          <h2 id="login-access-title" className="text-[13.5px] font-bold text-ink">
            Who can sign in
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
            Accounts in the operators team, added by an admin. This site has no sign-up, so a
            public Safeway account will not open it.
          </p>
          <p className="mt-4 text-[13.5px] text-ink-2">
            Not an operator?{" "}
            <a href={MAIN_SITE} className={linkClass}>
              Open the Safeway app
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
