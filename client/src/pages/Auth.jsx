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

export function Login() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, loading } = useSession();
  const [view, setView] = useState("signin"); // "signin" | "forgot"
  const go = (next) => next !== view && wipeThen(() => setView(next));
  // Already signed in? Login has nothing to offer — open the app.
  useEffect(() => {
    if (!loading && user) nav("/dashboard", { replace: true });
  }, [loading, user, nav]);
  // Where the user was headed when the guard bounced them here.
  const from = location.state?.from;
  const cameForPage = typeof from === "string" && from.startsWith("/") && !from.startsWith("//");

  return (
    <>
      {cameForPage && view === "signin" && (
        <p className="mx-auto mb-4 mt-6 max-w-md text-center text-[13.5px] font-semibold text-teal-800 dark:text-teal-300">
          Sign in to continue to your map.
        </p>
      )}
      {view === "signin" ? (
        <SignIn
          onSignUp={() => wipeThen(() => nav("/signup"))}
          onForgot={() => go("forgot")}
          onSuccess={() => nav(cameForPage ? from : "/dashboard", { replace: true })}
        />
      ) : (
        <ForgotPassword onBackToSignIn={() => go("signin")} />
      )}
    </>
  );
}

export function Signup() {
  const nav = useNavigate();
  const { user, loading } = useSession();
  useEffect(() => {
    if (!loading && user) nav("/dashboard", { replace: true });
  }, [loading, user, nav]);
  return (
    <SignUp onSignIn={() => wipeThen(() => nav("/login"))} onSuccess={() => nav("/dashboard", { replace: true })} />
  );
}

// Landing target for the Google OAuth2 token flow (…/auth/callback?userId&secret).
export function OAuthCallback() {
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
      <AuthFrame title="Google sign-in didn't finish" sub="The sign-in link expired or was already used." footer={<Link to="/login" className="font-bold text-teal-800 underline dark:text-teal-300">Back to login</Link>}>
        <BeuiButton to="/login">Try again</BeuiButton>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Finishing sign-in" sub="Hold on a second…" footer={<></>}>
      <p className="text-[14px] text-slate-600 dark:text-slate-400">
        Confirming your Google account and opening your dashboard.
      </p>
    </AuthFrame>
  );
}

// Landing target for the Appwrite verification email (…/verify?userId&secret).
export function Verify() {
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
    return <AuthFrame title="Verifying your email" sub="Hold on a second…" footer={<></>}><p className="text-[14px] text-slate-600 dark:text-slate-400">Confirming your verification link.</p></AuthFrame>;
  }
  if (state === "ok") {
    return (
      <AuthFrame title="Email verified" sub="Your address is confirmed. You are all set." footer={<Link to="/dashboard" className="font-bold text-teal-800 underline dark:text-teal-300">Go to dashboard</Link>}>
        <BeuiBadge tone="safe">Verified</BeuiBadge>
      </AuthFrame>
    );
  }
  if (state === "fail") {
    return (
      <AuthFrame title="Link expired or invalid" sub="Verification links are single-use and expire." footer={<Link to="/signup" className="font-bold text-teal-800 underline dark:text-teal-300">Back to sign up</Link>}>
        <BeuiBadge tone="danger">Not verified</BeuiBadge>
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title="Check your inbox" sub="A verification link is on its way. Click it, then come back and your map is waiting." footer={<>Wrong address? <Link to="/signup" className="font-bold text-teal-800 underline dark:text-teal-300">Start over</Link></>}>
      <div className="rounded-2xl border border-teal-600/20 bg-teal-50 p-4 text-[14px] text-teal-900 dark:border-teal-400/20 dark:bg-white/5 dark:text-teal-200">
        <p className="font-bold">Verification is optional</p>
        <p className="mt-1">The link confirms your email for account recovery. You can keep using Safeway right away:</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <BeuiButton to="/dashboard" className="flex-1">Open dashboard</BeuiButton>
        <BeuiButton to="/login" variant="ghost">Back to login</BeuiButton>
      </div>
    </AuthFrame>
  );
}

// Landing target for the reset email (…/reset?userId&secret).
export function ResetPassword() {
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
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (confirm !== password) return setError("Passwords do not match.");
    setLoading(true);
    try {
      await account.updateRecovery({ userId, secret, password });
      nav("/login", { replace: true });
    } catch (ex) {
      console.error("[reset] failed:", ex?.code ?? ex?.message ?? ex);
      setError(friendlyError(ex, "This reset link is invalid or expired. Request a new one."));
      setLoading(false);
    }
  };

  if (!valid) {
    return (
      <AuthFrame title="Invalid reset link" sub="Reset links are single-use and expire." footer={<Link to="/login" className="font-bold text-teal-800 underline dark:text-teal-300">Back to login</Link>}>
        <BeuiBadge tone="danger">Missing token</BeuiBadge>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Choose a new password" sub="At least 8 characters. You will sign in with it next time." footer={<Link to="/login" className="font-bold text-teal-800 underline dark:text-teal-300">Back to login</Link>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <label className="block">
          <span className="mb-1.5 block text-[13.5px] font-semibold">New password</span>
          <input
            type="password" required minLength={8} autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-teal-600 dark:border-white/15 dark:bg-slate-950 dark:focus:border-teal-400"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13.5px] font-semibold">Confirm new password</span>
          <input
            type="password" required minLength={8} autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-teal-600 dark:border-white/15 dark:bg-slate-950 dark:focus:border-teal-400"
          />
        </label>
        {error && <p className="text-[13px] font-semibold text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <BeuiButton type="submit" className="w-full" disabled={loading}>
          {loading ? "Saving…" : "Save new password"}
        </BeuiButton>
      </form>
    </AuthFrame>
  );
}

export function AuthError() {
  const [left, restart] = useCooldown(60);
  return (
    <AuthFrame title="Too many attempts" sub="Sign-in is paused to stop abuse. Try again when the timer ends." footer={<Link to="/login" className="font-bold text-teal-800 underline dark:text-teal-300">Back to login</Link>}>
      <div className="rounded-2xl border border-red-300 bg-red-50 p-5 dark:border-red-500/30 dark:bg-red-500/10">
        <BeuiBadge tone="danger">Rate limit exceeded</BeuiBadge>
        <p className="mt-2 text-[14px] font-semibold text-red-800 dark:text-red-300" role="status">
          {left > 0 ? `Retry available in ${left} seconds.` : "Press Retry now below to try again."}
        </p>
      </div>
      <div className="mt-4">
        <BeuiButton variant="ghost" className="w-full" disabled={left > 0} onClick={restart}>
          {left > 0 ? `Wait ${left}s` : "Retry now"}
        </BeuiButton>
      </div>
    </AuthFrame>
  );
}
