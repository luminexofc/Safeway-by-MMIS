import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import BeuiBadge from "../beui/BeuiBadge";

export default function AuthFrame({ title, sub, children, footer }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-[1fr_1.1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0a2126] p-8 text-white md:flex">
          <div className="relative">
            <p className="text-[18px] font-bold tracking-tight">Safeway</p>
            <h2 className="mt-2 text-[26px] font-bold leading-tight tracking-tight">One map. Every safe road. No guesswork.</h2>
            <ul className="mt-4 space-y-2 text-[14px] text-slate-300">
              <li>Roads colored by review status</li>
              <li>Flooding reports with GPS and photo</li>
              <li>Push alerts near verified water</li>
            </ul>
          </div>
          <div className="relative flex gap-2">
            <BeuiBadge tone="safe">Green: clear</BeuiBadge>
            <BeuiBadge tone="caution">Amber: waterlogged</BeuiBadge>
            <BeuiBadge tone="danger">Red: blocked</BeuiBadge>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900 sm:p-8">
          <h1 className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {sub && <p className="mt-1 text-[14.5px] text-slate-600 dark:text-slate-400">{sub}</p>}
          <div className="mt-5 space-y-4">{children}</div>
          {footer && <p className="mt-5 text-center text-[13.5px] text-slate-600 dark:text-slate-400">{footer}</p>}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13.5px] font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12.5px] font-semibold text-red-600 dark:text-red-400" role="alert">{error}</span>}
    </label>
  );
}

const INPUT_CLS =
  "min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] text-slate-900 outline-none placeholder:text-slate-500 focus:border-teal-600 dark:border-white/15 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-teal-400";

export function TextInput({ error, ...props }) {
  return (
    <input
      {...props}
      aria-invalid={!!error}
      className={`${INPUT_CLS} ${error ? "border-red-400 dark:border-red-500" : ""}`}
    />
  );
}

export function PasswordField({ error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input
        {...props}
        type={show ? "text" : "password"}
        aria-invalid={!!error}
        className={`${INPUT_CLS} pr-12 ${error ? "border-red-400 dark:border-red-500" : ""}`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
      >
        {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </span>
  );
}

export function LockNote({ locked, lockLeft }) {
  return (
    <p className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold ${locked ? "border-red-300 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" : "border-slate-200 text-slate-600 dark:border-white/10 dark:text-slate-400"}`} role="status">
      {locked ? `Too many attempts. Try again in ${lockLeft}s.` : "Rate limiting protects your account."}
    </p>
  );
}
