import { useState, useEffect } from "react";
import { account, ID } from "../../lib/appwrite";
import { startGoogleAuth, useSession } from "../../lib/session";
import { friendlyError } from "../../lib/errors";
import AuthFrame, { Field, TextInput, PasswordField, LockNote } from "./AuthFrame";
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

  useEffect(() => {
    if (!lockLeft) return;
    const t = setTimeout(() => {
      setLockLeft((s) => s - 1);
      if (lockLeft === 1) setAttempts(0);
    }, 1000);
    return () => clearTimeout(t);
  }, [lockLeft]);

  const set = (k) => (e) => {
    const v = k === "agree" ? e.target.checked : e.target.value;
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (locked || loading) return;
    const err = {};
    if (f.name.trim().length < 2) err.name = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) err.email = "Enter a valid email address.";
    if (f.pw.length < 8) err.pw = "Password must be at least 8 characters.";
    if (f.cpw !== f.pw || !f.cpw) err.cpw = "Passwords do not match.";
    if (!f.agree) err.agree = "Accept the Privacy Policy and Terms to continue.";
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
        setServerError(friendlyError(ex, "Could not create your account. Please try again."));
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
          ? "Your account was created, but we couldn't sign you in. Please sign in below."
          : "This email already has an account — it may have been created with Google. Use “Sign up with Google”, or reset your password from the Login page."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      title="Create an account"
      sub="Stay safe and report waterlogging."
      footer={
        <>
          Already have an account?{" "}
          <button type="button" onClick={onSignIn} className="cursor-pointer font-bold text-teal-800 underline dark:text-teal-300">Sign in</button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name" error={errors.name}>
          <TextInput type="text" placeholder="Full Name" autoComplete="name" value={f.name} error={errors.name} onChange={set("name")} />
        </Field>
        <Field label="Email" error={errors.email}>
          <TextInput type="email" placeholder="Email Address" autoComplete="email" value={f.email} error={errors.email} onChange={set("email")} />
        </Field>
        <Field label="Password" error={errors.pw}>
          <PasswordField placeholder="Password" autoComplete="new-password" value={f.pw} error={errors.pw} onChange={set("pw")} />
        </Field>
        <Field label="Confirm password" error={errors.cpw}>
          <PasswordField placeholder="Confirm Password" autoComplete="new-password" value={f.cpw} error={errors.cpw} onChange={set("cpw")} />
        </Field>
        <div>
          <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={f.agree} onChange={set("agree")} aria-invalid={!!errors.agree}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-teal-700" />
            <span>I agree to the Privacy Policy &amp; Terms and Conditions.</span>
          </label>
          {errors.agree && <p className="mt-1 text-[12.5px] font-semibold text-red-600 dark:text-red-400" role="alert">{errors.agree}</p>}
        </div>
        {serverError && <p className="text-[13px] font-semibold text-red-600 dark:text-red-400" role="alert">{serverError}</p>}
        <BeuiButton type="submit" loading={loading} disabled={locked} className="w-full">
          {locked ? `Wait ${lockLeft}s` : "Create account"}
        </BeuiButton>
      </form>
      <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-500 dark:text-slate-400">
        <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" /> or <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" aria-hidden="true" />
      </div>
      <BeuiButton variant="ghost" className="w-full" onClick={() => startGoogleAuth()}>
        <GoogleIcon /> Sign up with Google
      </BeuiButton>
      <LockNote locked={locked} lockLeft={lockLeft} />
    </AuthFrame>
  );
}
