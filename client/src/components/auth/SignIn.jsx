import { useState, useEffect } from "react";
import { account } from "../../lib/appwrite";
import { startGoogleAuth, useSession } from "../../lib/session";
import { friendlyError } from "../../lib/errors";
import AuthFrame, { Field, TextInput, PasswordField, LockNote } from "./AuthFrame";
import BeuiButton from "../beui/BeuiButton";
import { GoogleIcon } from "./GoogleIcon";

export default function SignIn({ onSignUp, onForgot, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockLeft, setLockLeft] = useState(0);
  const locked = lockLeft > 0;
  const { refresh, setUser } = useSession();

  useEffect(() => {
    if (!lockLeft) return;
    const t = setTimeout(() => {
      setLockLeft((s) => s - 1);
      if (lockLeft === 1) setAttempts(0);
    }, 1000);
    return () => clearTimeout(t);
  }, [lockLeft]);

  const submit = async (e) => {
    e.preventDefault();
    if (locked || loading) return;
    const err = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) err.email = "Enter a valid email address.";
    if (password.length < 8) err.password = "Password must be at least 8 characters.";
    setErrors(err);
    setServerError("");
    if (Object.keys(err).length) {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) setLockLeft(30);
      return;
    }
    setLoading(true);
    try {
      const session = await account.createEmailPasswordSession({ email, password });
      setUser({ $id: session.userId });
      refresh();
      onSuccess && onSuccess();
    } catch (ex) {
      console.error("[signin] failed:", ex?.code ?? ex?.message ?? ex);
      setServerError(friendlyError(ex, "Could not sign in. Please try again."));
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) setLockLeft(30);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title="Welcome back"
      sub="Sign in to your routes and reports."
      footer={
        <>
          New here?{" "}
          <button type="button" onClick={onSignUp} className="cursor-pointer font-bold text-teal-800 underline dark:text-teal-300">Create an account</button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" error={errors.email}>
          <TextInput type="email" placeholder="Email" autoComplete="email" value={email} error={errors.email}
            onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" error={errors.password}>
          <PasswordField placeholder="Password" autoComplete="current-password" value={password} error={errors.password}
            onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex items-center justify-end">
          <button type="button" onClick={onForgot} className="cursor-pointer text-[13.5px] font-bold text-teal-800 underline dark:text-teal-300">Forgot password?</button>
        </div>
        {serverError && <p className="text-[13px] font-semibold text-red-600 dark:text-red-400" role="alert">{serverError}</p>}
        <BeuiButton type="submit" loading={loading} disabled={locked} className="w-full">
          {locked ? `Wait ${lockLeft}s` : "Sign in"}
        </BeuiButton>
      </form>
      <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" /> or <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" />
      </div>
      <BeuiButton variant="ghost" className="w-full" onClick={() => startGoogleAuth()}>
        <GoogleIcon /> Sign in with Google
      </BeuiButton>
      <LockNote locked={locked} lockLeft={lockLeft} />
    </AuthFrame>
  );
}
