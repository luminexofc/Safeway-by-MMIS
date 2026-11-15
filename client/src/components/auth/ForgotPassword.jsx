import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { account } from "../../lib/appwrite";
import AuthFrame, { Field, TextInput, LockNote } from "./AuthFrame";
import { useAuthCopy } from "./authCopy";
import BeuiButton from "../beui/BeuiButton";

export default function ForgotPassword({ onBackToSignIn }) {
  const { t } = useAuthCopy();
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
      setError(t.errorEmail);
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
        title={t.checkEmail}
        sub={t.sentTo(email)}
        footer={
          <button type="button" onClick={onBackToSignIn} className="cursor-pointer font-bold text-accent-strong underline dark:text-accent">{t.backToSignIn}</button>
        }
      >
        <div className="flex items-center gap-2.5 rounded-xl border border-rule bg-safe-soft p-4 dark:border-white/10 dark:bg-white/5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-safe dark:text-safe" aria-hidden="true" />
          <p className="text-[14px] font-semibold text-ink dark:text-ink">
            {resent ? t.newLinkOnWay : t.linkOnWay}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <BeuiButton loading={loading} disabled={resendIn > 0} onClick={() => send(true)} className="flex-1">
            {resendIn > 0 ? t.resendIn(resendIn) : t.resendLink}
          </BeuiButton>
          <BeuiButton variant="ghost" onClick={() => { setSent(false); setResent(false); }}>{t.differentEmail}</BeuiButton>
        </div>
        <LockNote locked={locked} lockLeft={lockLeft} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title={t.forgotTitle}
      sub={t.forgotSub}
      footer={
        <button type="button" onClick={onBackToSignIn} className="cursor-pointer font-bold text-accent-strong underline dark:text-accent">{t.backToSignIn}</button>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t.emailOnly} error={error} id="forgot-email">
          <TextInput id="forgot-email" type="email" placeholder={t.emailHint} autoComplete="email" value={email} error={error}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
        </Field>
        <BeuiButton type="submit" loading={loading} disabled={locked} className="w-full">
          {locked ? t.waitSeconds.replace("{seconds}", String(lockLeft)) : t.sendReset}
        </BeuiButton>
      </form>
      <LockNote locked={locked} lockLeft={lockLeft} />
    </AuthFrame>
  );
}
