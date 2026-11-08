import { useState, useEffect } from "react";
import { account, ID } from "../../lib/appwrite";
import { startGoogleAuth, useSession } from "../../lib/session";
import { friendlyError } from "../../lib/errors";
import "./signup.css";
import SignUpScene from "./SignUpScene";
import { EyeIcon, GoogleIcon, WaterSplash } from "./AuthParts";

const Logo = () => (
  <svg width="46" height="54" viewBox="0 0 46 54" aria-hidden="true">
    <defs>
      <linearGradient id="slg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#19f7a2" /><stop offset="1" stopColor="#2a8cf0" />
      </linearGradient>
    </defs>
    <circle cx="23" cy="19" r="16" fill="none" stroke="#19f7a2" strokeWidth="5" />
    <path d="M23 8c-4 6-8 9-8 13a8 8 0 0016 0c0-4-4-7-8-13z" fill="#3aa0ff" />
    <path d="M5 30c6 3 10-2 18 1s11 0 18-2c-4 9-11 17-18 24C16 46 9 38 5 30z" fill="url(#slg)" />
  </svg>
);

export default function SignUp({ onSignIn, onSuccess }) {
  const [f, setF] = useState({ name: "", email: "", pw: "", cpw: "", agree: false });
  const [show, setShow] = useState({ pw: false, cpw: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
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
    setDone(false);
    setServerError("");
    if (Object.keys(err).length) {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) setLockLeft(30);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setLoading(true);
    try {
      await account.create({ userId: ID.unique(), email: f.email.trim(), password: f.pw, name: f.name.trim() });
      // Signed in the moment the account exists — no second sign-in needed.
      const session = await account.createEmailPasswordSession({ email: f.email.trim(), password: f.pw });
      setUser({ $id: session.userId });
      refresh();
      const origin = window.location.origin;
      // Best-effort verification email; the app works without it.
      await account.createVerification({ url: `${origin}/verify` }).catch(() => {});
      setDone(true);
      setTimeout(() => onSuccess && onSuccess(), 700);
    } catch (ex) {
      console.error("[signup] failed:", ex?.code ?? ex?.message ?? ex);
      setServerError(friendlyError(ex, "Could not create your account. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const googleSignUp = () => startGoogleAuth();

  const field = (k, type, ph, auto) => (
    <div className="su-field">
      <div className="su-wrap">
        <input type={k === "pw" || k === "cpw" ? (show[k] ? "text" : "password") : type} placeholder={ph}
          aria-label={ph} autoComplete={auto} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]}
          className={errors[k] ? "err" : ""} />
        {(k === "pw" || k === "cpw") && (
          <button type="button" className="su-eye" aria-label={show[k] ? "Hide password" : "Show password"}
            onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))}>
            <EyeIcon off={!show[k]} />
          </button>
        )}
      </div>
      {errors[k] && <div className="su-msg" role="alert">{errors[k]}</div>}
    </div>
  );

  const stop = (e) => e.preventDefault();

  return (
    <div className="su">

      <section className="su-left">
        <SignUpScene />
        <div className="su-caption">
          <h2>Avoid Waterlogged Roads</h2>
          <p>Map and real-time updates</p>
        </div>
      </section>

      <section className="su-right">
        <div className="su-splash tr"><WaterSplash id="g1" /></div>
        <div className="su-splash br"><WaterSplash id="g2" flip /></div>

        <div className="su-box">
          <div className="su-logo"><Logo /> Safeway</div>
          <h1 className="su-title">Create an Account</h1>
          <p className="su-sub">Stay safe and report waterlogging.</p>

          <form className={`su-form ${shake ? "su-shake" : ""}`} onSubmit={submit} noValidate>
            {field("name", "text", "Full Name", "name")}
            {field("email", "email", "Email Address", "email")}
            {field("pw", "password", "Password", "new-password")}
            {field("cpw", "password", "Confirm Password", "new-password")}

            <label className="su-check">
              <input type="checkbox" checked={f.agree} onChange={set("agree")} />
              <span className="su-tick">
                <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="#04130d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span>I agree to the <a href="#privacy" className="su-link" onClick={stop}>Privacy Policy</a> &amp; <a href="#terms" className="su-link" onClick={stop}>Terms and Conditions</a></span>
            </label>
            {errors.agree && <div className="su-msg" role="alert" style={{ margin: "-14px 0 16px" }}>{errors.agree}</div>}

            {serverError && <div className="su-msg" role="alert" style={{ margin: "0 0 12px" }}>{serverError}</div>}
            <button className="su-btn" type="submit" disabled={loading || locked}>
              {loading ? <span className="su-spin" /> : "Register"}
            </button>
            {done && <div className="su-ok" role="status">Account created. Welcome to Safeway!</div>}
          </form>

          <button className="su-google" type="button" onClick={googleSignUp}><GoogleIcon /> Sign up with Google</button>
          <p className="su-signin">
            Already have an account?{" "}
            <a href="#signin" className="su-link" onClick={(e) => { e.preventDefault(); onSignIn && onSignIn(); }}>Login</a>
          </p>

          <div className={`su-note ${locked ? "lock" : ""}`} role="status">
            <svg width="22" height="24" viewBox="0 0 24 26" aria-hidden="true">
              <path d="M12 1l10 4v8c0 6-4.5 10.5-10 12C6.5 23.5 2 19 2 13V5z" fill={locked ? "#ff6b6b" : "#19f7a2"} />
              <path d="M7.5 13l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {locked ? `Too many attempts. Try again in ${lockLeft}s.` : "Rate Limit Protection Active"}
          </div>
        </div>
      </section>
    </div>
  );
}
