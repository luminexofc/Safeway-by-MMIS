// beui-adapted Card + Input + Island + Toasts + CommandPalette
// Design language from @beui/card, input, dynamic-island, animated-toast-stack, command-palette.
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, MapPin, Navigation, TriangleAlert, CheckCircle2, X, Command } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../../../shared/cn";
import { SPRING_PANEL, SPRING_LAYOUT } from "../../lib/ease";

export function BeuiCard({ children, className = "" }) {
  return <div className={cn("rounded-2xl border border-slate-200/80 bg-white dark:border-white/10 dark:bg-slate-900", className)}>{children}</div>;
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton rounded-xl ${className}`} />;
}

export function BeuiInput({ label, hint, error, success, ...props }) {
  const reduce = useReducedMotion();
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[13.5px] font-semibold text-slate-800 dark:text-slate-100">{label}</span>}
      <motion.span
        className="block"
        {...(reduce || !error ? {} : { animate: { x: [0, -7, 7, -4, 4, 0] }, transition: { duration: 0.35 } })}
      >
        <span className={cn("flex min-h-[48px] items-center gap-2 rounded-xl border bg-white px-4 transition-colors dark:bg-slate-950",
          error ? "border-red-400 dark:border-red-500" : success ? "border-emerald-400 dark:border-emerald-500" : "border-slate-200 focus-within:border-teal-600 dark:border-white/15 dark:focus-within:border-teal-400")}>
          <input {...props} className="w-full bg-transparent py-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400" />
          {success && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
        </span>
      </motion.span>
      {hint && !error && <span className="mt-1 block text-[12.5px] text-slate-500 dark:text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-[12.5px] font-semibold text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}

// Dynamic-island style live safety pill: width morph with blur crossfade.
export function SafetyIsland({ tone = "safe", title, sub }) {
  const reduce = useReducedMotion();
  const dot = tone === "safe" ? "bg-emerald-400" : tone === "caution" ? "bg-amber-400" : "bg-red-400";
  return (
    <motion.div layout={!reduce} transition={SPRING_LAYOUT}
      className="inline-flex max-w-full items-center gap-3 rounded-full border border-white/15 bg-slate-950 py-2 pl-3 pr-4 text-white">
      <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
      <span className="min-w-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={title} initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.22 }} className="block truncate text-[13.5px] font-bold leading-tight">
            {title}
          </motion.span>
        </AnimatePresence>
        {sub && <span className="block truncate text-[12px] text-slate-300">{sub}</span>}
      </span>
    </motion.div>
  );
}

// Toast stack in the beui animated-toast-stack language: layout-aware, swipe dismiss.
let toastId = 0;
export function useToasts() {
  const [items, setItems] = useState([]);
  const push = (t) => {
    const id = ++toastId;
    setItems((p) => [...p.slice(-2), { id, ...t }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 4200);
  };
  const dismiss = (id) => setItems((p) => p.filter((x) => x.id !== id));
  return { items, push, dismiss };
}

export function ToastViewport({ items, onDismiss }) {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[900] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div key={t.id} layout={!reduce} initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={SPRING_PANEL} drag={reduce ? false : "x"} dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 80) onDismiss(t.id); }}
            className="pointer-events-auto flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 text-white shadow-pop backdrop-blur">
            {t.tone === "danger" ? <TriangleAlert className="h-4 w-4 shrink-0 text-red-400" /> : t.tone === "caution" ? <TriangleAlert className="h-4 w-4 shrink-0 text-amber-400" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
            <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug">{t.text}</span>
            <button onClick={() => onDismiss(t.id)} className="cursor-pointer rounded-lg p-1 hover:bg-white/10" aria-label="Dismiss"><X className="h-4 w-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Command palette in the beui command-palette language: glass surface, fuzzy filter, keyboard nav.
const ACTIONS = [
  { id: "dash", label: "Open safety map", hint: "Dashboard", to: "/dashboard", icon: MapPin },
  { id: "nav", label: "Find a safe route", hint: "Navigate", to: "/navigate", icon: Navigation },
  { id: "ctg", label: "Route to Chattogram", hint: "Anywhere in Bangladesh", to: "/navigate", icon: Navigation },
  { id: "sylhet", label: "Route to Sylhet", hint: "Anywhere in Bangladesh", to: "/navigate", icon: Navigation },
  { id: "report", label: "Report waterlogging", hint: "Quick", to: "/report", icon: TriangleAlert },
  { id: "my", label: "Track my reports", hint: "Verification queue", to: "/my-reports", icon: Search },
  { id: "profile", label: "Open profile", hint: "Identity and account", to: "/profile", icon: Search },
  { id: "settings", label: "Open settings", hint: "Alerts and location", to: "/settings", icon: Search },
];

export function CommandPalette({ open, onClose }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ACTIONS;
    return ACTIONS.filter((a) => (a.label + " " + a.hint).toLowerCase().includes(s));
  }, [q]);

  useEffect(() => {
    if (open) { setQ(""); setCursor(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open ]);

  useEffect(() => { setCursor(0); }, [q]);

  const go = (to) => { onClose(); nav(to); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[950] flex items-start justify-center bg-slate-950/50 px-4 pt-[12vh] backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-pop dark:border-white/10 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search Safeway">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 dark:border-white/10">
              <Search className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                  if (e.key === "Enter" && results[cursor]) go(results[cursor].to);
                }}
                placeholder="Where to? Try a city, road, or Report…"
                className="h-14 w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-500 dark:text-slate-100 dark:placeholder:text-slate-400" />
              <kbd className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 sm:inline-flex dark:border-white/10 dark:bg-white/5 dark:text-slate-400"><Command className="h-3 w-3" />K</kbd>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-2 nice-scroll">
              {results.length === 0 && <p className="px-3 py-6 text-center text-[14px] text-slate-500 dark:text-slate-400">No match. Try a city name or “Report”.</p>}
              {results.map((a, i) => (
                <button key={a.id} onClick={() => go(a.to)} onMouseEnter={() => setCursor(i)}
                  className={cn("pressable flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left focus-visible:bg-slate-100 dark:focus-visible:bg-white/10",
                    i === cursor ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10")}>
                  <a.icon className={cn("h-4 w-4 shrink-0", i === cursor ? "text-teal-300 dark:text-teal-700" : "text-slate-500 dark:text-slate-400")} />
                  <span className="flex-1 text-[14px] font-semibold">{a.label}</span>
                  <span className={cn("text-[12px]", i === cursor ? "text-slate-300 dark:text-slate-500" : "text-slate-500 dark:text-slate-400")}>{a.hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
