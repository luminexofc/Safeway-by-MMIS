import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Info, TriangleAlert } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useGeolocation, BD_DIVISIONS } from "../services/geo";
import { useTheme } from "../../../shared/theme";
import { useSession } from "../lib/session";
import { getProfile, upsertProfile } from "../lib/appwrite";
import { friendlyError } from "../lib/errors";
import { onRadioKey } from "../lib/radio";
import { NotificationSettingsSkeleton } from "../components/Skeletons";
import { useLang } from "../lib/lang";
import "./settings.css";

const COPY = {
  en: {
    title: "Settings",
    desc: "Alerts, location and appearance. Your name and sign-in address are under Profile.",
    alerts: "Alerts",
    pushNotice: "Push delivery is not switched on yet, so nothing is sent today. These choices are saved to your profile and will apply once it is.",
    loadError: "Your saved preferences did not load, so editing is paused. Reloading first keeps you from overwriting them with defaults.",
    reloadPrefs: "Reload preferences",
    nearbyLabel: "Nearby road alerts",
    nearbyDesc: "A notice when a waterlogged road near you is verified.",
    ownLabel: "Updates on your reports",
    ownDesc: "When operators decide on a report you sent.",
    radiusLabel: "Alert radius",
    homeDivision: "Home division",
    anywhere: "Anywhere in Bangladesh",
    divisionHint: "Used to pick which alerts reach you.",
    saving: "Saving…",
    saveAlerts: "Save alerts",
    saved: "Saved.",
    saveFailed: "Could not save these preferences. Try again in a moment.",
    noChanges: "No changes to save.",
    location: "Location",
    located: (m) => `Located to within about ${m} m. Maps can centre on you.`,
    locating: "Locating…",
    denied: "Location permission denied. Type an address instead.",
    unsupported: "This browser cannot share location. Type an address instead.",
    unavailable: "Location is unavailable right now. Type an address instead.",
    notRequested: "Not requested yet. Maps still work with a typed address.",
    updateLocation: "Update location",
    tryAgain: "Try again",
    allowLocation: "Allow location",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    system: "System",
    systemNote: (resolved) => `System. This device is currently ${resolved}.`,
    darkNote: "Dark. The map uses night tiles.",
    lightNote: "Light. The map uses day tiles.",
    privacy: "Privacy",
    privacyPolicy: "Privacy policy",
    privacyDesc: "What is stored, and who can read it",
    profile: "Profile",
    profileDesc: "Your name and sign-in address",
  },
  bn: {
    title: "সেটিংস",
    desc: "সতর্কতা, অবস্থান ও চেহারা। আপনার নাম ও লগইনের ঠিকানা প্রোফাইলে আছে।",
    alerts: "সতর্কতা",
    pushNotice: "পুশ নোটিফিকেশন এখনো চালু হয়নি, তাই আজ কিছু পাঠানো হয় না। এই পছন্দগুলো আপনার প্রোফাইলে সংরক্ষিত থাকবে এবং চালু হলে কার্যকর হবে।",
    loadError: "আপনার সংরক্ষিত পছন্দ লোড হয়নি, তাই সম্পাদনা বন্ধ আছে। আগে রিলোড করলে ডিফল্ট দিয়ে তা মুছে যাওয়া থেকে বাঁচবে।",
    reloadPrefs: "পছন্দ আবার লোড করুন",
    nearbyLabel: "আশপাশের সড়ক সতর্কতা",
    nearbyDesc: "আপনার কাছাকাছি কোনো জলাবদ্ধ সড়ক যাচাই হলে জানানো হবে।",
    ownLabel: "আপনার রিপোর্টের হালনাগাদ",
    ownDesc: "আপনার পাঠানো রিপোর্টে অপারেটর সিদ্ধান্ত নিলে জানানো হবে।",
    radiusLabel: "সতর্কতার ব্যাসার্ধ",
    homeDivision: "আপনার বিভাগ",
    anywhere: "বাংলাদেশের যেকোনো স্থান",
    divisionHint: "কোন সতর্কতা আপনার কাছে পৌঁছাবে তা ঠিক করতে ব্যবহৃত হয়।",
    saving: "সংরক্ষণ হচ্ছে…",
    saveAlerts: "সতর্কতা সংরক্ষণ করুন",
    saved: "সংরক্ষিত হয়েছে।",
    saveFailed: "এই পছন্দগুলো সংরক্ষণ করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    noChanges: "সংরক্ষণের মতো কোনো পরিবর্তন নেই।",
    location: "অবস্থান",
    located: (m) => `প্রায় ${m} মিটার নির্ভুলতায় অবস্থান পাওয়া গেছে। মানচিত্র আপনাকে কেন্দ্র করে দেখাতে পারে।`,
    locating: "খোঁজা হচ্ছে…",
    denied: "অবস্থানের অনুমতি দেওয়া হয়নি। এর বদলে ঠিকানা লিখুন।",
    unsupported: "এই ব্রাউজার অবস্থান শেয়ার করতে পারে না। এর বদলে ঠিকানা লিখুন।",
    unavailable: "এই মুহূর্তে অবস্থান পাওয়া যাচ্ছে না। এর বদলে ঠিকানা লিখুন।",
    notRequested: "এখনো অনুমতি চাওয়া হয়নি। লেখা ঠিকানা দিয়েও মানচিত্র কাজ করে।",
    updateLocation: "অবস্থান হালনাগাদ করুন",
    tryAgain: "আবার চেষ্টা",
    allowLocation: "অবস্থানের অনুমতি দিন",
    appearance: "চেহারা",
    light: "লাইট",
    dark: "ডার্ক",
    system: "সিস্টেম",
    systemNote: (resolved) => `সিস্টেম। এই ডিভাইস এখন ${resolved} মোডে আছে।`,
    darkNote: "ডার্ক। মানচিত্র রাতের টাইল ব্যবহার করে।",
    lightNote: "লাইট। মানচিত্র দিনের টাইল ব্যবহার করে।",
    privacy: "গোপনীয়তা",
    privacyPolicy: "গোপনীয়তা নীতি",
    privacyDesc: "কী সংরক্ষিত হয় এবং কে তা পড়তে পারে",
    profile: "প্রোফাইল",
    profileDesc: "আপনার নাম ও লগইনের ঠিকানা",
  },
};

function SwitchRow({ id, label, desc, checked, onChange, disabled }) {
  return (
    <div className="stg-row">
      <div className="stg-row-text">
        <span className="stg-row-label" id={`${id}-label`}>
          {label}
        </span>
        <span className="stg-row-desc" id={`${id}-desc`}>
          {desc}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-desc`}
        className="stg-switch"
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="stg-switch-knob" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function Settings() {
  const { user } = useSession();
  const [lang] = useLang();
  const copy = COPY[lang] || COPY.en;

  const APPEARANCE = [
    { id: "light", label: copy.light },
    { id: "dark", label: copy.dark },
    { id: "system", label: copy.system },
  ];
  const [push, setPush] = useState(true);
  const [notifyOwn, setNotifyOwn] = useState(true);
  const [radius, setRadius] = useState(5);
  const [division, setDivision] = useState("");
  const [baseline, setBaseline] = useState(null);
  const [load, setLoad] = useState("loading"); // loading | ready | error
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { kind: "ok" | "error", text }
  const geo = useGeolocation(false);
  const { mode, resolved, setMode } = useTheme();

  // Appearance wording needs the resolved theme, so it is derived after it.
  const resolvedLabel = copy[resolved] || resolved;
  const appearanceNote = (m) => {
    if (m === "system") return copy.systemNote(resolvedLabel);
    if (m === "dark") return copy.darkNote;
    return copy.lightNote;
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    getProfile(user.$id)
      .then((p) => {
        if (!active) return;
        const next = {
          push: p?.notifyNearby !== false,
          notifyOwn: p?.notifyOwn !== false,
          radius: p?.alertRadiusKm ?? 5,
          division: p?.division ?? "",
        };
        setPush(next.push);
        setNotifyOwn(next.notifyOwn);
        setRadius(next.radius);
        setDivision(next.division);
        setBaseline(next);
        setLoad("ready");
      })
      .catch(() => {
        // Defaults written over stored preferences would be data loss.
        if (active) setLoad("error");
      });
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  const canEdit = load === "ready" && baseline !== null;
  const dirty =
    canEdit &&
    (push !== baseline.push ||
      notifyOwn !== baseline.notifyOwn ||
      Number(radius) !== Number(baseline.radius) ||
      division !== baseline.division);

  const change = (setter) => (value) => {
    setter(value);
    setSaveMsg(null);
  };

  const reload = () => {
    setLoad("loading");
    setReloadKey((k) => k + 1);
  };

  const save = async () => {
    if (!user || saving || !dirty || !canEdit) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await upsertProfile(user, {
        notifyNearby: push,
        notifyOwn,
        alertRadiusKm: Number(radius),
        division: division || undefined,
      });
      setBaseline({ push, notifyOwn, radius: Number(radius), division });
      setSaveMsg({ kind: "ok", text: copy.saved });
    } catch (err) {
      console.error("[settings] save failed:", err?.code ?? err?.message ?? err);
      setSaveMsg({
        kind: "error",
        text: friendlyError(err, copy.saveFailed, lang),
      });
    } finally {
      setSaving(false);
    }
  };

  const locationLine =
    geo.status === "ok" && geo.pos
      ? copy.located(Math.round(geo.pos.accuracy))
      : geo.status === "locating"
        ? copy.locating
        : geo.status === "denied"
          ? copy.denied
          : geo.status === "unsupported"
            ? copy.unsupported
            : geo.status === "error"
              ? copy.unavailable
              : copy.notRequested;

  const locationAction =
    geo.status === "ok"
      ? copy.updateLocation
      : geo.status === "locating"
        ? copy.locating
        : geo.status === "denied" || geo.status === "error"
          ? copy.tryAgain
          : copy.allowLocation;

  return (
    <div className="stg">
      <PageHeader title={copy.title} description={copy.desc} />

      <section className="stg-section" aria-labelledby="stg-alerts">
        <h2 id="stg-alerts" className="stg-h2">
          {copy.alerts}
        </h2>

        <div className="stg-notice">
          <Info className="h-4 w-4" aria-hidden="true" />
          <span>{copy.pushNotice}</span>
        </div>

        {load === "loading" ? (
          <NotificationSettingsSkeleton />
        ) : load === "error" ? (
          <div className="stg-notice" role="alert">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            <span>{copy.loadError}</span>
            <button type="button" className="stg-btn stg-btn--ghost" onClick={reload}>
              {copy.reloadPrefs}
            </button>
          </div>
        ) : (
          <>
            <div className="stg-rows">
              <SwitchRow
                id="stg-push"
                label={copy.nearbyLabel}
                desc={copy.nearbyDesc}
                checked={push}
                onChange={change(setPush)}
                disabled={!canEdit}
              />
              <SwitchRow
                id="stg-own"
                label={copy.ownLabel}
                desc={copy.ownDesc}
                checked={notifyOwn}
                onChange={change(setNotifyOwn)}
                disabled={!canEdit}
              />
            </div>

            <div className="stg-form">
              <div className="stg-field">
                <div className="stg-range-row">
                  <label className="stg-label" htmlFor="stg-radius">
                    {copy.radiusLabel}
                  </label>
                  <span className="stg-range-value">{radius} {lang === "bn" ? "কিমি" : "km"}</span>
                </div>
                <input
                  id="stg-radius"
                  className="stg-range"
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={radius}
                  onChange={(e) => change(setRadius)(Number(e.target.value))}
                  disabled={!canEdit}
                  aria-describedby="stg-radius-ends"
                />
                <div id="stg-radius-ends" className="stg-range-ends">
                  <span>1 {lang === "bn" ? "কিমি" : "km"}</span>
                  <span>25 {lang === "bn" ? "কিমি" : "km"}</span>
                </div>
              </div>

              <div className="stg-field">
                <label className="stg-label" htmlFor="stg-division">
                  {copy.homeDivision}
                </label>
                <select
                  id="stg-division"
                  className="stg-select"
                  value={division}
                  onChange={(e) => change(setDivision)(e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">{copy.anywhere}</option>
                  {BD_DIVISIONS.map((d) => (
                    <option key={d.slug} value={d.slug}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <span className="stg-hint">{copy.divisionHint}</span>
              </div>

              <div className="stg-actions">
                <button
                  type="button"
                  className="stg-btn stg-btn--primary"
                  onClick={save}
                  disabled={saving || !dirty || !canEdit}
                >
                  {saving ? copy.saving : copy.saveAlerts}
                </button>
                {saveMsg ? (
                  <p
                    className={saveMsg.kind === "error" ? "stg-save stg-save--error" : "stg-save"}
                    role={saveMsg.kind === "error" ? "alert" : "status"}
                  >
                    {saveMsg.text}
                  </p>
                ) : !dirty ? (
                  <p className="stg-save">{copy.noChanges}</p>
                ) : null}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="stg-section" aria-labelledby="stg-location">
        <h2 id="stg-location" className="stg-h2">
          {copy.location}
        </h2>
        <div className="stg-location">
          <p className="stg-status" role="status">
            {locationLine}
          </p>
          {geo.status !== "unsupported" ? (
            <button
              type="button"
              className="stg-btn stg-btn--ghost"
              onClick={geo.locate}
              disabled={geo.status === "locating"}
            >
              {locationAction}
            </button>
          ) : null}
        </div>
      </section>

      <section className="stg-section" aria-labelledby="stg-appearance">
        <h2 id="stg-appearance" className="stg-h2">
          {copy.appearance}
        </h2>
        <div className="stg-choices" role="radiogroup" aria-labelledby="stg-appearance">
          {APPEARANCE.map((option, index) => {
            const selected = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                className="stg-choice"
                onClick={() => setMode(option.id)}
                onKeyDown={(e) =>
                  onRadioKey(e, index, APPEARANCE.length, (i) => setMode(APPEARANCE[i].id))
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="stg-status" role="status">
          {appearanceNote(mode)}
        </p>
      </section>

      <section className="stg-section" aria-labelledby="stg-privacy">
        <h2 id="stg-privacy" className="stg-h2">
          {copy.privacy}
        </h2>
        <ul className="stg-links">
          <li>
            <Link to="/privacy" className="stg-link">
              <span className="stg-link-title">{copy.privacyPolicy}</span>
              <span className="stg-link-desc">{copy.privacyDesc}</span>
            </Link>
          </li>
          <li>
            <Link to="/profile" className="stg-link">
              <span className="stg-link-title">{copy.profile}</span>
              <span className="stg-link-desc">{copy.profileDesc}</span>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
