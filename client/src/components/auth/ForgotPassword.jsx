import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { account } from "../../lib/appwrite";
import AuthFrame, { Field, TextInput, LockNote } from "./AuthFrame";
import BeuiButton from "../beui/BeuiButton";

export default function ForgotPassword({ onBackToSignIn }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resent, setResent] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockLeft, setLockLeft] = useState(0);
  const locked = lockLeft > 0;

  useEffect(() => {
    if (!lockLeft) return;
    const t = setTimeout(() => { setLockLeft((s) => s - 1); if (lockLeft === 1) setAttempts(0); }, 1000);
    return () => clearTimeout(t);
  }, [lockLeft]);

  useEffect(() => {
    if (!resendIn) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const send = async (again) => {
    setLoading(true);
    setError("");
    try {
      await account.createRecovery({ email: email.trim(), url: `${window.location.origin}/reset` });
    } catch {
      // Do not leak whether the address is registered — same outcome either way.
    } finally {
      setSent(true);
      setResendIn(30);
      setResent(!!again);
      setLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (locked || loading) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email address.");
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) setLockLeft(30);
      return;
    }
    setError("");
    send(false);
  };

  if (sent) {
    return (
      <AuthFrame
        title="Check your email"
        sub={`We sent a password reset link to ${email}.`}
        footer={
          <button type="button" onClick={onBackToSignIn} className="cursor-pointer font-bold text-teal-800 underline dark:text-teal-300">Back to sign in</button>
        }
      >
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-600/20 bg-emerald-50 p-4 dark:border-emerald-400/20 dark:bg-white/5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-emerald-900 dark:text-emerald-200">
            {resent ? "A new reset link is on its way." : "If the address is registered, the link is on its way."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <BeuiButton loading={loading} disabled={resendIn > 0} onClick={() => send(true)} className="flex-1">
            {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend link"}
          </BeuiButton>
          <BeuiButton variant="ghost" onClick={() => { setSent(false); setResent(false); }}>Different email</BeuiButton>
        </div>
        <LockNote locked={locked} lockLeft={lockLeft} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Forgot password?"
      sub="No worries. Enter your email and we'll send you a link to reset it."
      footer={
        <button type="button" onClick={onBackToSignIn} className="cursor-pointer font-bold text-teal-800 underline dark:text-teal-300">Back to sign in</button>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Email" error={error}>
          <TextInput type="email" placeholder="Email" autoComplete="email" value={email} error={error}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
        </Field>
        <BeuiButton type="submit" loading={loading} disabled={locked} className="w-full">
          {locked ? `Wait ${lockLeft}s` : "Send reset link"}
        </BeuiButton>
      </form>
      <LockNote locked={locked} lockLeft={lockLeft} />
    </AuthFrame>
  );
}
