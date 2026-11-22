import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import BeuiButton from "../components/beui/BeuiButton";
import BeuiBadge from "../components/beui/BeuiBadge";
import AuthFrame from "../components/auth/AuthFrame";
import SignIn from "../components/auth/SignIn";
import SignUp from "../components/auth/SignUp";
import ForgotPassword from "../components/auth/ForgotPassword";
import { account } from "../lib/appwrite";
import { useSession } from "../lib/session";
import { friendlyError } from "../lib/errors";
import { useCooldown } from "../lib/useCooldown";
import { wipeThen } from "../lib/wipe";
import { useAuthCopy } from "../components/auth/authCopy";

export function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, loading } = useSession();
  const [view, setView] = useState("signin"); // "signin" | "forgot"
  const go = (next) => next !== view && wipeThen(() => setView(next));
  // Where the user was headed when the prompt or the guard sent them here.
  // Only same-origin absolute paths are honoured, never a protocol-relative URL.
  const from = location.state?.from;
  const cameForPage = typeof from === "string" && from.startsWith("/") && !from.startsWith("//");
  const next = cameForPage ? from : "/dashboard";
  // Already signed in? Login has nothing to offer — continue to the task that
  // brought them here (or the dashboard when they came for sign-in itself).
  // This must use `next` as well: signing in sets the user, which fires this
  // effect before onSuccess navigates, and a plain /dashboard here would
  // silently drop the destination the prompt carried.
  useEffect(() => {
    if (!loading && user) nav(next, { replace: true });
  }, [loading, user, nav, next]);

  return view === "signin" ? (
    <SignIn
      onSignUp={() => wipeThen(() => nav("/signup", { state: { from } }))}
      onForgot={() => go("forgot")}
      onSuccess={() => nav(next, { replace: true })}
    />
  ) : (
    <ForgotPassword onBackToSignIn={() => go("signin")} />
  );
}

export function Signup() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, loading } = useSession();
  // The prompt on the map or the landing page sends people here with the task
  // they were reaching for, so a new account lands on it instead of the map.
  const from = location.state?.from;
  const next = typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard";
  useEffect(() => {
    if (!loading && user) nav(next, { replace: true });
  }, [loading, user, nav, next]);
  return (
    <SignUp onSignIn={() => wipeThen(() => nav("/login", { state: { from } }))} onSuccess={() => nav(next, { replace: true })} />
  );
}

// Landing target for the Google OAuth2 token flow (…/auth/callback?userId&secret).
export function OAuthCallback() {
  const { t } = useAuthCopy();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { refresh } = useSession();
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const userId = params.get("userId");
    const secret = params.get("secret");
    if (!userId || !secret) {
      setFailed(true);
      return;
    }
    (async () => {
      try {
        await account.createSession({ userId, secret });
        // Confirms the session actually persisted (localStorage fallback)
        // and fills in the name/email for the header.
        const me = await refresh();
        if (!me) throw new Error("session not persisted");
        nav("/dashboard", { replace: true });
      } catch (ex) {
        console.error("[oauth] callback failed:", ex?.code ?? ex?.message ?? ex);
        setFailed(true);
      }
    })();
  }, [params, refresh, nav]);

  if (failed) {
    return (
      <AuthFrame title={t.googleFailed} sub={t.googleFailedSub} footer={<Link to="/login" className="font-bold text-accent-strong underline dark:text-accent">{t.backToLogin}</Link>}>
        <BeuiButton to="/login">{t.tryAgain}</BeuiButton>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title={t.finishingSignIn} sub={t.holdOn} footer={<></>}>
      <p className="text-[14px] text-slate-600 dark:text-slate-400">
        {t.confirmingGoogle}
      </p>
    </AuthFrame>
  );
}

// Landing target for the Appwrite verification email (…/verify?userId&secret).
export function Verify() {
  const { t } = useAuthCopy();
  const [params] = useSearchParams();
  const userId = params.get("userId");
  const secret = params.get("secret");
  const [state, setState] = useState(userId && secret ? "checking" : "idle"); // idle|checking|ok|fail

  useEffect(() => {
    if (state !== "checking") return;
    account
      .updateEmailVerification({ userId, secret })
      .then(() => setState("ok"))
      .catch(() => setState("fail"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "checking") {
    return <AuthFrame title={t.verifyingEmail} sub={t.holdOn} footer={<></>}><p className="text-[14px] text-slate-600 dark:text-slate-400">{t.confirmingLink}</p></AuthFrame>;
  }
  if (state === "ok") {
    return (
      <AuthFrame title={t.emailVerified} sub={t.emailVerifiedSub} footer={<Link to="/dashboard" className="font-bold text-accent-strong underline dark:text-accent">{t.goToDashboard}</Link>}>
        <BeuiBadge tone="info">{t.verified}</BeuiBadge>
      </AuthFrame>
    );
  }
  if (state === "fail") {
    return (
      <AuthFrame title={t.linkExpired} sub={t.linkExpiredSub} footer={<Link to="/signup" className="font-bold text-accent-strong underline dark:text-accent">{t.backToSignUp}</Link>}>
        <BeuiBadge tone="neutral">{t.notVerified}</BeuiBadge>
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title={t.checkInbox} sub={t.checkInboxSub} footer={<>{t.wrongAddress} <Link to="/signup" className="font-bold text-accent-strong underline dark:text-accent">{t.startOver}</Link></>}>
      <div className="rounded-2xl border border-rule bg-safe-soft p-4 text-[14px] text-ink dark:border-white/10 dark:bg-white/5 dark:text-ink-2">
        <p className="font-bold">{t.verificationOptional}</p>
        <p className="mt-1">{t.verificationNote}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <BeuiButton to="/dashboard" className="flex-1">{t.openDashboard}</BeuiButton>
        <BeuiButton to="/login" variant="ghost">{t.backToLogin}</BeuiButton>
      </div>
    </AuthFrame>
  );
}

// Landing target for the reset email (…/reset?userId&secret).
export function ResetPassword() {
  const { t, lang } = useAuthCopy();
  const [params] = useSearchParams();
  const userId = params.get("userId") || "";
  const secret = params.get("secret") || "";
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const valid = Boolean(userId && secret);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError(t.passwordShort);
    if (confirm !== password) return setError(t.passwordMismatch);
    setLoading(true);
    try {
      await account.updateRecovery({ userId, secret, password });
      nav("/login", { replace: true });
    } catch (ex) {
      console.error("[reset] failed:", ex?.code ?? ex?.message ?? ex);
      setError(friendlyError(ex, t.resetInvalid, lang));
      setLoading(false);
    }
  };

  if (!valid) {
    return (
      <AuthFrame title={t.invalidReset} sub={t.invalidResetSub} footer={<Link to="/login" className="font-bold text-accent-strong underline dark:text-accent">{t.backToLogin}</Link>}>
        <BeuiBadge tone="neutral">{t.missingToken}</BeuiBadge>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title={t.choosePassword} sub={t.choosePasswordSub} footer={<Link to="/login" className="font-bold text-accent-strong underline dark:text-accent">{t.backToLogin}</Link>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-[13.5px] font-semibold">{t.newPassword}</span>
          <input
            type="password" required minLength={8} autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-focus dark:border-white/15 dark:bg-paper dark:focus:border-focus"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13.5px] font-semibold">{t.confirmNewPassword}</span>
          <input
            type="password" required minLength={8} autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-focus dark:border-white/15 dark:bg-paper dark:focus:border-focus"
          />
        </label>
        {error && <p className="text-[13px] font-semibold text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <BeuiButton type="submit" className="w-full" disabled={loading}>
          {loading ? t.savingPassword : t.savePassword}
        </BeuiButton>
      </form>
    </AuthFrame>
  );
}

export function AuthError() {
  const { t } = useAuthCopy();
  const [left, restart] = useCooldown(60);
  return (
    <AuthFrame title={t.tooMany} sub={t.tooManySub} footer={<Link to="/login" className="font-bold text-accent-strong underline dark:text-accent">{t.backToLogin}</Link>}>
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10">
        <BeuiBadge tone="neutral">{t.rateLimited}</BeuiBadge>
        <p className="mt-2 text-[14px] font-semibold text-red-800 dark:text-red-300" role="status">
          {left > 0 ? t.retryIn(left) : t.retryNowHint}
        </p>
      </div>
      <div className="mt-4">
        <BeuiButton variant="ghost" className="w-full" disabled={left > 0} onClick={restart}>
          {left > 0 ? t.waitSeconds.replace("{seconds}", String(left)) : t.retryNow}
        </BeuiButton>
      </div>
    </AuthFrame>
  );
}
