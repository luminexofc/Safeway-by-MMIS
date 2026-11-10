import { useState, useEffect } from "react";
import { account } from "../../lib/appwrite";
import { startGoogleAuth, useSession } from "../../lib/session";
import AuthFrame, { Field, TextInput, PasswordField, LockNote } from "./AuthFrame";
import { authError, useAuthCopy } from "./authCopy";
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
  const { lang, t } = useAuthCopy();

  useEffect(() => {
    if (!lockLeft) return;
    const t = setTimeout(() => {
      setLockLeft((s) => s - 1);
      if (lockLeft === 1) setAttempts(0);
    }, 1000);
    return () => clearTimeout(t);
  }, [lockLeft]);

  useEffect(() => {
    setErrors((previous) => ({
      email: previous.email ? t.errorEmail : undefined,
      password: previous.password ? t.errorPassword : undefined,
    }));
  }, [lang, t]);

  const submit = async (e) => {
    e.preventDefault();
    if (locked || loading) return;
    const err = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) err.email = t.errorEmail;
    if (password.length < 8) err.password = t.errorPassword;
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
      setServerError(authError(ex, t.signInFailed, t, lang));
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) setLockLeft(30);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title={t.signInTitle}
      sub={t.signInSub}
      footer={
        <>
          {t.newTo}{" "}
          <button type="button" onClick={onSignUp} className="sw-auth-inline-link">{t.createAccount}</button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t.email} error={errors.email} id="signin-email">
          <TextInput id="signin-email" type="email" placeholder={t.emailHint} autoComplete="email" value={email} error={errors.email}
            onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t.password} error={errors.password} id="signin-password">
          <PasswordField id="signin-password" placeholder={t.passwordHint} autoComplete="current-password" value={password} error={errors.password}
            onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex items-center justify-end">
          <button type="button" onClick={onForgot} className="sw-auth-inline-link">{t.forgot}</button>
        </div>
        {serverError && <p className="text-[13px] font-semibold text-red-600 dark:text-red-400" role="alert">{serverError}</p>}
        <BeuiButton type="submit" loading={loading} disabled={locked} className="sw-auth-primary-button w-full">
          {locked ? t.waitSeconds.replace("{seconds}", String(lockLeft)) : t.signIn}
        </BeuiButton>
      </form>
      <div className="sw-auth-divider">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" /> {t.continueWith} <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" />
      </div>
      <BeuiButton variant="ghost" className="sw-auth-google-button w-full" onClick={() => startGoogleAuth()}>
        <GoogleIcon /> {t.googleSignIn}
      </BeuiButton>
      {locked && <LockNote locked={locked} lockLeft={lockLeft} />}
    </AuthFrame>
  );
}
