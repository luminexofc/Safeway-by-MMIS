import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, X } from "lucide-react";
import { useLang } from "../../lib/lang";

// One dialog for every "you need an account for this" moment. Browsing the
// map stays open to everyone, so the prompt only appears when someone reaches
// for an action that writes data (filing a report) or exposes their own
// history (tracking a report). The destination travels in router state, so
// the sign-in and sign-up screens can send the person back to the exact task
// they were reaching for instead of dumping them on the dashboard.
const COPY = {
  en: {
    label: "Account required",
    signIn: "Sign in",
    signUp: "Create account",
    cancel: "Not now",
    close: "Close",
  },
  bn: {
    label: "অ্যাকাউন্ট প্রয়োজন",
    signIn: "লগইন",
    signUp: "অ্যাকাউন্ট খুলুন",
    cancel: "পরে",
    close: "বন্ধ করুন",
  },
};

export default function SignInPrompt({ open, title, body, from = "/dashboard", onClose }) {
  const nav = useNavigate();
  const [lang] = useLang();
  const t = COPY[lang] || COPY.en;
  const cardRef = useRef(null);
  const primaryRef = useRef(null);

  // Escape closes, and focus moves into the dialog so a keyboard user is not
  // left tabbing through the map behind it. Tab is also wrapped inside the
  // card: the dialog claims aria-modal, so focus must not escape to the map
  // behind it, and it has to return to whatever opened it on close.
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    primaryRef.current?.focus();

    const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const items = [...cardRef.current.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      // Wrap at either edge, and pull focus in if it has somehow left already.
      if (e.shiftKey && (document.activeElement === first || !cardRef.current.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !cardRef.current.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      // Back to the control that opened the dialog, not the top of the page.
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const go = (path) => {
    onClose?.();
    nav(path, { state: { from, prompt: true } });
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-end justify-center bg-overlay p-3 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        // A click on the scrim (never inside the card) dismisses.
        if (cardRef.current && !cardRef.current.contains(e.target)) onClose?.();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sw-prompt-title"
        aria-describedby="sw-prompt-body"
        lang={lang}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-rule bg-surface shadow-pop"
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <p className="sw-eyebrow mb-1">{t.label}</p>
            <h2 id="sw-prompt-title" className="text-[19px] font-bold leading-snug text-ink">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {body ? (
          <p id="sw-prompt-body" className="px-5 pt-2 text-[14px] leading-relaxed text-ink-2">
            {body}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 px-5 pb-5 sm:flex-row-reverse">
          <button
            ref={primaryRef}
            type="button"
            onClick={() => go("/login")}
            className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-solid px-4 text-[14px] font-bold text-solid-ink transition-colors hover:bg-solid-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {t.signIn}
          </button>
          <button
            type="button"
            onClick={() => go("/signup")}
            className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rule-strong bg-surface px-4 text-[14px] font-bold text-ink transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {t.signUp}
          </button>
        </div>
        <div className="border-t border-rule">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer px-5 py-3 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-paper-2 hover:text-ink"
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
