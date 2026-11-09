import { useEffect, useState } from "react";
import BeuiButton from "../components/beui/BeuiButton";
import PageHeader from "../components/PageHeader";
import BeuiBadge from "../components/beui/BeuiBadge";
import { BeuiCard } from "../components/beui/beui";
import { useGeolocation, BD_DIVISIONS } from "../services/geo";
import { useTheme } from "../../../shared/theme";
import { useSession } from "../lib/session";
import { getProfile, upsertProfile } from "../lib/appwrite";
import { friendlyError } from "../lib/errors";

const APPEARANCE_NOTE = {
  light: "Light theme.",
  dark: "Dark theme. The map switches to night tiles.",
  system: "System theme. Follows your device setting.",
};

export default function Settings() {
  const { user } = useSession();
  const [push, setPush] = useState(true);
  const [notifyOwn, setNotifyOwn] = useState(true);
  const [radius, setRadius] = useState(5);
  const [division, setDivision] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");
  const geo = useGeolocation(false);
  const { mode, setMode } = useTheme();
  const appearanceNote = APPEARANCE_NOTE[mode] || APPEARANCE_NOTE.system;

  useEffect(() => {
    if (!user) return;
    getProfile(user.$id)
      .then((p) => {
        if (!p) return;
        setPush(p.notifyNearby !== false);
        setNotifyOwn(p.notifyOwn !== false);
        setRadius(p.alertRadiusKm ?? 5);
        setDivision(p.division ?? "");
      })
      .catch(() => {});
  }, [user]);

  const locationLine =
    geo.status === "ok" && geo.pos
      ? `Locked: ${geo.pos.lat.toFixed(4)}, ${geo.pos.lng.toFixed(4)}`
      : geo.status === "locating"
        ? "Locating…"
        : geo.status === "denied" || geo.status === "error"
          ? "Unavailable. Maps still work with typed addresses."
          : "Not requested yet.";

  const save = async () => {
    if (!user || saving) return;
    setSaving(true);
    setSaved("");
    try {
      await upsertProfile(user, {
        notifyNearby: push,
        notifyOwn,
        alertRadiusKm: Number(radius),
        division: division || undefined,
      });
      setSaved("Saved");
    } catch (err) {
      console.error("[settings] save failed:", err?.code ?? err?.message ?? err);
      setSaved(friendlyError(err, "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const toggle = (setter) => (value) => {
    setter(value);
    setSaved("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Settings" description="App preferences. Your identity lives under Profile." />

      <BeuiCard className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-bold">Notifications</h2>
          <BeuiBadge tone={push ? "safe" : "neutral"}>{push ? "Push on" : "Push off"}</BeuiBadge>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
          <div><p className="text-[14.5px] font-bold">Push alerts</p><p className="text-[13px] text-slate-500 dark:text-slate-400">A notice before a newly verified waterlogged road.</p></div>
          <button role="switch" aria-checked={push} onClick={() => toggle(setPush)(!push)} className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors ${push ? "bg-teal-700 dark:bg-teal-500" : "bg-slate-300 dark:bg-slate-600"}`}>
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ease-out ${push ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5">
          <div><p className="text-[14.5px] font-bold">Your report updates</p><p className="text-[13px] text-slate-500 dark:text-slate-400">When operators decide one of your reports.</p></div>
          <button role="switch" aria-checked={notifyOwn} onClick={() => toggle(setNotifyOwn)(!notifyOwn)} className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full transition-colors ${notifyOwn ? "bg-teal-700 dark:bg-teal-500" : "bg-slate-300 dark:bg-slate-600"}`}>
            <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ease-out ${notifyOwn ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
        <div className="mt-3">
          <span className="mb-1.5 block text-[14px] font-semibold">Alert radius: {radius} km</span>
          <input type="range" min={1} max={25} value={radius} onChange={(e) => { setRadius(Number(e.target.value)); setSaved(""); }} className="w-full accent-teal-700" aria-label="Alert radius in kilometers" />
        </div>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-[14px] font-semibold">Home division</span>
          <select
            value={division}
            onChange={(e) => { setDivision(e.target.value); setSaved(""); }}
            className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] outline-none focus:border-teal-600 dark:border-white/15 dark:bg-slate-950 dark:focus:border-teal-400"
          >
            <option value="">Anywhere in Bangladesh</option>
            {BD_DIVISIONS.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name}</option>
            ))}
          </select>
        </label>
        <div className="mt-4 flex items-center gap-3">
          <BeuiButton onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</BeuiButton>
          {saved && <BeuiBadge tone={saved === "Saved" ? "safe" : "danger"}>{saved}</BeuiBadge>}
        </div>
      </BeuiCard>

      <BeuiCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-bold">Location</h2>
            <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400" role="status">{locationLine}</p>
          </div>
          <BeuiButton variant="ghost" onClick={geo.locate}>
            {geo.status === "locating" ? "Locating…" : "Enable location"}
          </BeuiButton>
        </div>
      </BeuiCard>

      <BeuiCard className="p-6">
        <h2 className="text-[16px] font-bold">Appearance</h2>
        <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400" role="status">{appearanceNote}</p>
        <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
          {[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
            { id: "system", label: "System" },
          ].map((o) => (
            <button
              key={o.id}
              role="radio"
              aria-checked={mode === o.id}
              onClick={() => setMode(o.id)}
              className={`min-h-[48px] cursor-pointer rounded-xl border-2 px-3 text-[14px] font-bold transition-colors ${
                mode === o.id
                  ? "border-teal-700 bg-teal-700 text-white dark:border-teal-300 dark:bg-teal-600 dark:text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-transparent dark:text-slate-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12.5px] text-slate-500 dark:text-slate-400">System follows your device. The map switches to night tiles in dark.</p>
      </BeuiCard>

      <BeuiCard className="p-6">
        <h2 className="text-[16px] font-bold">About</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
          Safeway for Bangladesh. Reports and map markers come from the live Appwrite backend,
          routes use open map data, and verification happens on the operator console.
        </p>
      </BeuiCard>
    </div>
  );
}
