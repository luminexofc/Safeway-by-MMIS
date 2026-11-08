import { useState, useEffect } from "react";
import { account } from "../../lib/appwrite";
import { startGoogleAuth, useSession } from "../../lib/session";
import { friendlyError } from "../../lib/errors";
import "./signin.css";
import SignInScene from "./SignInScene";
import { EyeIcon, GoogleIcon, WaterSplash } from "./AuthParts";

const Logo = () => (
  <svg width="44" height="52" viewBox="0 0 44 52" aria-hidden="true">
    <defs>
      <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#19f7a2" />
        <stop offset="1" stopColor="#2a8cf0" />
      </linearGradient>
    </defs>
    <path d="M22 2C11 2 3 10 3 20c0 13 19 30 19 30s19-17 19-30C41 10 33 2 22 2z" fill="url(#lg)" />
    <path d="M22 9c-4 6-8 10-8 14a8 8 0 0016 0c0-4-4-8-8-14z" fill="#0d1b3a" />
    <path d="M22 12c-3 5-6 8-6 11a6 6 0 0012 0c0-3-3-6-6-11z" fill="#3aa0ff" />
    <path d="M7 30c5 3 9-2 15 1s10 0 15-2c-3 7-9 14-15 20C16 44 10 37 7 30z" fill="#1ec9c0" opacity=".85" />
  </svg>
);

export default function SignIn({ onSignUp, onForgot, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const [done, setDone] = useState(false);
  const { refresh, setUser } = useSession();

  const [lockLeft, setLockLeft] = useState(0);
  const locked = lockLeft > 0;

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
    if (password.length < 6) err.password = "Password must be at least 6 characters.";
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
      // The session is ours now — set identity immediately so the protected
      // routes open on the spot; display details fill in via refresh().
      const session = await account.createEmailPasswordSession({ email, password });
      setUser({ $id: session.userId });
      refresh();
      setDone(true);
      setTimeout(() => onSuccess && onSuccess(), 700);
    } catch (ex) {
      console.error("[signin] failed:", ex?.code ?? ex?.message ?? ex);
      setServerError(friendlyError(ex, "Could not sign in. Please try again."));
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 5) setLockLeft(30);
      setShake(true);
      setTimeout(() => setShake(false), 450);
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = () => startGoogleAuth();

  return (
    <div className="sp">

      <section className="sp-left">
        <SignInScene />
        <div className="sp-mist" />
        <div className="sp-flash" />
        <div className="sp-caption">
          <h2>Avoid Waterlogged Roads</h2>
          <p>Real-time crowd-sourced navigation.</p>
        </div>
      </section>

      <section className="sp-right">
        <div className="sp-splash tr"><WaterSplash id="sg1" /></div>
        <div className="sp-splash br"><WaterSplash id="sg2" flip /></div>

        <div className="sp-box">
          <div className="sp-logo"><Logo /> Safeway</div>
          <h1 className="sp-title">Welcome Back!</h1>
          <p className="sp-sub">Sign in to safe your commute</p>

          <form className={`sp-form ${shake ? "sp-shake" : ""}`} onSubmit={submit} noValidate>
            <div className="sp-field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" placeholder="Email" autoComplete="email" value={email}
                className={errors.email ? "err" : ""} onChange={(e) => setEmail(e.target.value)} />
              {errors.email && <div className="sp-msg">{errors.email}</div>}
            </div>

            <div className="sp-field" style={{ marginBottom: 14 }}>
              <label htmlFor="password">Password</label>
              <div className="sp-inputwrap">
                <input id="password" type={show ? "text" : "password"} placeholder="Password" autoComplete="current-password"
                  aria-invalid={!!errors.password} value={password} className={errors.password ? "err" : ""}
                  onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="sp-eye" aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow((s) => !s)}>
                  <EyeIcon off={!show} />
                </button>
              </div>
              {errors.password && <div className="sp-msg">{errors.password}</div>}
            </div>

            <a href="#forgot" className="sp-forgot" onClick={(e) => { e.preventDefault(); onForgot && onForgot(); }}>Forgot Password?</a>

            {serverError && <div className="sp-msg" role="alert">{serverError}</div>}
            <button className="sp-btn" type="submit" disabled={loading || locked}>
              {loading ? <span className="sp-spin" /> : "Login"}
            </button>
            {done && <div className="sp-ok">Signed in. Redirecting to your routes…</div>}
          </form>

          <button className="sp-google" type="button" onClick={googleSignIn}><GoogleIcon /> Sign in with Google</button>
          <p className="sp-signup">
            Don't have an account?{" "}
            <a href="#signup" className="sp-link" onClick={(e) => { e.preventDefault(); onSignUp && onSignUp(); }}>Register now</a>
          </p>

          <div className={`sp-note ${locked ? "lock" : ""}`} role="status">
            <svg width="24" height="26" viewBox="0 0 24 26" aria-hidden="true">
              <path d="M12 1l10 4v8c0 6-4.500 10.500-10 12C6.500 23.500 2 19 2 13V5z" fill="#f5b81c" />
              <path d="M7.500 13l3 3 6-6.500" fill="none" stroke="#0d1b3a" strokeWidth="2.400" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {locked ? `Too many attempts. Try again in ${lockLeft}s.` : "Rate limiting active to protect your account"}
          </div>
        </div>
      </section>
    </div>
  );
}
