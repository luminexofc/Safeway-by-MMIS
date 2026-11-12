import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../../shared/theme";
import { cn } from "../../../shared/cn";

const OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

/** Theme picker: Light / Dark / System (follows the OS). Same control as admin. */
export default function ThemeToggle({ className = "" }) {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const Current = (OPTIONS.find((o) => o.id === mode) || OPTIONS[2]).icon;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Theme: ${mode}. Change theme`}
        title={`Theme: ${mode}`}
        className="inline-flex h-11 min-w-[44px] cursor-pointer items-center justify-center rounded-xl border border-rule text-ink-2 transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:hover:bg-white/10"
      >
        <Current className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Theme"
          className="absolute right-0 top-full z-[800] mt-2 w-44 overflow-hidden rounded-2xl border border-rule bg-surface p-1.5 shadow-pop"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitemradio"
              aria-checked={mode === o.id}
              onClick={() => {
                setMode(o.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold",
                mode === o.id
                  ? "bg-accent text-accent-ink"
                  : "text-ink-2 hover:bg-paper-2 dark:hover:bg-white/10"
              )}
            >
              <o.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="flex-1">{o.label}</span>
              {mode === o.id && <Check className="h-4 w-4" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
