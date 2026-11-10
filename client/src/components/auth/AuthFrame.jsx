import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, Route } from "lucide-react";
import { useAuthCopy } from "./authCopy";

export default function AuthFrame({ title, sub, children, footer }) {
  const videoRef = useRef(null);
  const { lang, setLang, t } = useAuthCopy();

  useEffect(() => {
    const video = videoRef.current;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (motionPreference.matches) {
        video?.pause();
      } else {
        video?.play().catch(() => {});
      }
    };
    syncPlayback();
    motionPreference.addEventListener("change", syncPlayback);
    return () => motionPreference.removeEventListener("change", syncPlayback);
  }, []);

  return (
    <main className="sw-auth-page" lang={lang}>
      <div className="sw-auth-photo" aria-hidden="true" />
      <video
        ref={videoRef}
        className="sw-auth-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/auth/road-navigation.png"
        aria-hidden="true"
      >
        <source src="/videos/auth/road-scene.mp4" type="video/mp4" />
      </video>
      <div className="sw-auth-fade" aria-hidden="true" />
      <section className="sw-auth-panel" aria-label="Account access">
        <div className="sw-auth-language" role="group" aria-label={t.language}>
          <button type="button" className={lang === "en" ? "is-current" : ""} aria-pressed={lang === "en"} aria-label={t.switchToEnglish} onClick={() => setLang("en")}>EN</button>
          <span className="sw-auth-language-divider" aria-hidden="true" />
          <button type="button" className={lang === "bn" ? "is-current" : ""} lang="bn" aria-pressed={lang === "bn"} aria-label={t.switchToBangla} onClick={() => setLang("bn")}>বাংলা</button>
        </div>
        <div className="sw-auth-card">
          <div className="sw-auth-brand" aria-label="Safeway">
            <span className="sw-auth-brand-mark"><Route aria-hidden="true" /></span>
            <span>Safeway</span>
          </div>
          <h1>{title}</h1>
          {sub && <p className="sw-auth-subtitle">{sub}</p>}
          <div className="sw-auth-content">{children}</div>
          {footer && <div className="sw-auth-footer">{footer}</div>}
        </div>
      </section>
    </main>
  );
}

export function Field({ label, error, id, children }) {
  return (
    <label className="sw-auth-field" htmlFor={id}>
      <span className="sw-auth-field-label">{label}</span>
      {children}
      {error && <span className="sw-auth-field-error" id={`${id}-error`} role="alert">{error}</span>}
    </label>
  );
}

const INPUT_CLS = "sw-auth-input";

export function TextInput({ error, ...props }) {
  return (
    <input
      {...props}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id}-error` : undefined}
      className={`${INPUT_CLS}${error ? " has-error" : ""}`}
    />
  );
}

export function PasswordField({ error, ...props }) {
  const [show, setShow] = useState(false);
  const { t } = useAuthCopy();
  return (
    <span className="sw-auth-password">
      <input
        {...props}
        type={show ? "text" : "password"}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id}-error` : undefined}
        className={`${INPUT_CLS} has-password-toggle${error ? " has-error" : ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t.hidePassword : t.showPassword}
        className="sw-auth-password-toggle"
      >
        {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </span>
  );
}

export function LockNote({ locked, lockLeft }) {
  const { lang, t } = useAuthCopy();
  return (
    <p className={`sw-auth-lock-note${locked ? " is-locked" : ""}`} role="status" lang={lang}>
      {t.attemptsLocked.replace("{seconds}", String(lockLeft))}
    </p>
  );
}
