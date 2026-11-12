import { createContext, useContext, useEffect, useState } from "react";

// One theme implementation for client + admin (DESIGN.md: Light / Dark /
// System in both, default is light until the visitor picks another mode.

const KEY = "sp-theme";
const ThemeCtx = createContext({ mode: "system", resolved: "light", setMode: () => {} });

function storedMode() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    /* private mode: fall through to system */
  }
  return "light";
}

function systemIsDark() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function applyResolved(resolved) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(storedMode);
  const [systemDark, setSystemDark] = useState(systemIsDark);
  const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    applyResolved(resolved);
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      /* private mode: preference lasts for the session */
    }
  }, [mode, resolved]);

  return (
    <ThemeCtx.Provider value={{ mode, resolved, setMode: setModeState }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);

/** The mode a one-click toggle moves to: light <-> dark. */
export const nextThemeMode = (m) => (m === "dark" ? "light" : "dark");
