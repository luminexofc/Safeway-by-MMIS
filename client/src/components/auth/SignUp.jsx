import { useState, useEffect } from "react";
import { account, ID } from "../../lib/appwrite";
import { startGoogleAuth, useSession } from "../../lib/session";
import AuthFrame, { Field, TextInput, PasswordField, LockNote } from "./AuthFrame";
import { authError, useAuthCopy } from "./authCopy";
import BeuiButton from "../beui/BeuiButton";
import { GoogleIcon } from "./GoogleIcon";

export default function SignUp({ onSignIn, onSuccess }) {
  const [f, setF] = useState({ name: "", email: "", pw: "", cpw: "", agree: false });
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
      name: previous.name ? t.errorName : undefined,
      email: previous.email ? t.errorEmail : undefined,
      pw: previous.pw ? t.errorPassword : undefined,
      cpw: previous.cpw ? t.errorConfirm : undefined,
      agree: previous.agree ? t.errorConsent : undefined,
    }));
  }, [lang, t]);

  const set = (k) => (e) => {
    const v = k === "agree" ? e.target.checked : e.target.value;
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (locked || loading) return;
    const err = {};
    if (f.name.trim().length < 2) err.name = t.errorName;
    if (!/^\S+@\S+\.\S+$/.test(f.email)) err.email = t.errorEmail;
    if (f.pw.length < 8) err.pw = t.errorPassword;
    if (f.cpw !== f.pw || !f.cpw) err.cpw = t.errorConfirm;
    if (!f.agree) err.agree = t.errorConsent;
    setErrors(err);
    setServerError("");
    if (Object.keys(err).length) {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) setLockLeft(30);
      return;
    }
    setLoading(true);
    let created = false;
    try {
      await account.create({ userId: ID.unique(), email: f.email.trim(), password: f.pw, name: f.name.trim() });
      created = true;
    } catch (ex) {
      console.error("[signup] create failed:", ex?.type ?? ex?.code, ex?.code, ex?.message ?? ex);
      if (ex?.code !== 409) {
        setServerError(authError(ex, t.signUpFailed, t, lang));
        setLoading(false);
        return;
      }
    }
    try {
      const session = await account.createEmailPasswordSession({ email: f.email.trim(), password: f.pw });
      setUser({ $id: session.userId });
      refresh();
      const origin = window.location.origin;
      await account.createVerification({ url: `${origin}/verify` }).catch(() => {});
      onSuccess && onSuccess();
    } catch (ex) {
      console.error("[signup] sign-in failed:", ex?.type ?? ex?.code, ex?.code, ex?.message ?? ex);
      setServerError(
        created
          ? t.accountCreated
          : t.existingAccount
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title={t.signUpTitle}
      sub={t.signUpSub}
      footer={
        <>
          {t.alreadyHaveAccount}{" "}
          <button type="button" onClick={onSignIn} className="sw-auth-inline-link">{t.signIn}</button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label={t.fullName} error={errors.name} id="signup-name">
          <TextInput id="signup-name" type="text" placeholder={t.nameHint} autoComplete="name" value={f.name} error={errors.name} onChange={set("name")} />
        </Field>
        <Field label={t.email} error={errors.email} id="signup-email">
          <TextInput id="signup-email" type="email" placeholder={t.emailHint} autoComplete="email" value={f.email} error={errors.email} onChange={set("email")} />
        </Field>
        <Field label={t.password} error={errors.pw} id="signup-password">
          <PasswordField id="signup-password" placeholder={t.passwordHintNew} autoComplete="new-password" value={f.pw} error={errors.pw} onChange={set("pw")} />
        </Field>
        <Field label={t.confirmPassword} error={errors.cpw} id="signup-confirm-password">
          <PasswordField id="signup-confirm-password" placeholder={t.confirmHint} autoComplete="new-password" value={f.cpw} error={errors.cpw} onChange={set("cpw")} />
        </Field>
        <div>
          <label className="sw-auth-consent">
            <input type="checkbox" checked={f.agree} onChange={set("agree")} aria-invalid={!!errors.agree}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-teal-700" />
            <span>{t.consent}</span>
          </label>
          {errors.agree && <p className="mt-1 text-[12.5px] font-semibold text-red-600 dark:text-red-400" role="alert">{errors.agree}</p>}
        </div>
        {serverError && <p className="text-[13px] font-semibold text-red-600 dark:text-red-400" role="alert">{serverError}</p>}
        <BeuiButton type="submit" loading={loading} disabled={locked} className="sw-auth-primary-button w-full">
          {locked ? t.waitSeconds.replace("{seconds}", String(lockLeft)) : t.signUpAction}
        </BeuiButton>
      </form>
      <div className="sw-auth-divider">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" /> {t.continueWith} <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" />
      </div>
      <BeuiButton variant="ghost" className="sw-auth-google-button w-full" onClick={() => startGoogleAuth()}>
        <GoogleIcon /> {t.googleSignUp}
      </BeuiButton>
      {locked && <LockNote locked={locked} lockLeft={lockLeft} />}
    </AuthFrame>
  );
}
