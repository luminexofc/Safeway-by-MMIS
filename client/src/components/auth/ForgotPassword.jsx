import { useState, useEffect } from "react";
import { account } from "../../lib/appwrite";
import "./forgot.css";
import ForgotScene from "./ForgotScene";
import { WaterSplash } from "./AuthParts";

const Logo = () => (
  <svg width="44" height="52" viewBox="0 0 44 52" aria-hidden="true">
    <defs><linearGradient id="flg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#19f7a2" /><stop offset="1" stopColor="#2a8cf0" /></linearGradient></defs>
    <path d="M22 2C11 2 3 10 3 20c0 13 19 30 19 30s19-17 19-30C41 10 33 2 22 2z" fill="url(#flg)" />
    <path d="M22 9c-4 6-8 10-8 14a8 8 0 0016 0c0-4-4-8-8-14z" fill="#0d1b3a" />
    <path d="M22 12c-3 5-6 8-6 11a6 6 0 0012 0c0-3-3-6-6-11z" fill="#3aa0ff" />
    <path d="M7 30c5 3 9-2 15 1s10 0 15-2c-3 7-9 14-15 20C16 44 10 37 7 30z" fill="#1ec9c0" opacity=".85" />
  </svg>
);

export default function ForgotPassword({ onBackToSignIn }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [resent, setResent] = useState(false);
  const [shake, setShake] = useState(false);
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
      setSent(true);
      setResendIn(30);
      setResent(!!again);
    } catch {
      // Do not leak whether the address is registered — same outcome either way.
      setSent(true);
      setResendIn(30);
      setResent(!!again);
    } finally {
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
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setError("");
    send(false);
  };

  const back = (e) => { e.preventDefault(); onBackToSignIn && onBackToSignIn(); };

  const BackLink = (
    <div className="fp-back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18f5a0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
      <a href="#signin" className="fp-link" onClick={back}>Back to Sign In</a>
    </div>
  );

  return (
    <div className="fp">

      <section className="fp-left">
        <ForgotScene />
        <div className="fp-flash" />
        <div className="fp-caption">
          <h2>Get Back on Safe Roads</h2>
          <p>We'll email you a secure reset link.</p>
        </div>
      </section>

      <section className="fp-right">
        <div className="fp-splash tr"><WaterSplash id="fg1" /></div>
        <div className="fp-splash br"><WaterSplash id="fg2" flip /></div>

        <div className="fp-box">
          <div className="fp-logo"><Logo /> Safeway</div>

          {!sent ? (
            <div className="fp-view" key="form">
              <h1 className="fp-title">Forgot Password?</h1>
              <p className="fp-sub">No worries. Enter your email and we'll send you a link to reset it.</p>

              <form className={`fp-form ${shake ? "fp-shake" : ""}`} onSubmit={submit} noValidate>
                <div className="fp-field">
                  <label htmlFor="fp-email">Email</label>
                  <input id="fp-email" type="email" placeholder="Email" autoComplete="email" value={email}
                    aria-invalid={!!error} className={error ? "err" : ""}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }} />
                  {error && <div className="fp-msg" role="alert">{error}</div>}
                </div>
                <button className="fp-btn" type="submit" disabled={loading || locked}>
                  {loading ? <span className="fp-spin" /> : "Send Reset Link"}
                </button>
              </form>
              {BackLink}
            </div>
          ) : (
            <div className="fp-view" key="sent">
              <svg className="fp-sent" width="96" height="96" viewBox="0 0 96 96" aria-hidden="true">
                <circle className="halo" cx="48" cy="48" r="40" />
                <circle cx="48" cy="48" r="40" pathLength="1" />
                <path className="ck" pathLength="1" d="M30 49l13 13 24-27" />
              </svg>
              <h1 className="fp-title" style={{ marginTop: 22 }}>Check Your Email</h1>
              <p className="fp-sub">We sent a password reset link to <span className="fp-email">{email}</span></p>

              <div className="fp-actions">
                <button className="fp-btn ghost" type="button" disabled={loading || resendIn > 0} onClick={() => send(true)}>
                  {loading ? <span className="fp-spin" style={{ borderColor: "rgba(255,255,255,.3)", borderTopColor: "#fff" }} />
                    : resendIn > 0 ? `Resend link in ${resendIn}s` : "Resend Link"}
                </button>
                <button className="fp-link" type="button" onClick={() => { setSent(false); setResent(false); }}>Use a different email</button>
              </div>
              {resent && !loading && <div className="fp-ok" role="status">A new reset link is on its way.</div>}
              {BackLink}
            </div>
          )}

          <div className={`fp-note ${locked ? "lock" : ""}`} role="status">
            <svg width="22" height="24" viewBox="0 0 24 26" aria-hidden="true">
              <path d="M12 1l10 4v8c0 6-4.5 10.5-10 12C6.5 23.5 2 19 2 13V5z" fill={locked ? "#ff6b6b" : "#f5b81c"} />
              <path d="M7.5 13l3 3 6-6.500" fill="none" stroke="#0d1b3a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {locked ? `Too many attempts. Try again in ${lockLeft}s.` : "Rate limiting active to protect your account"}
          </div>
        </div>
      </section>
    </div>
  );
}
