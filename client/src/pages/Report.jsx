import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { MapPin, Camera, ClipboardCheck, Check, LocateFixed } from "lucide-react";
import BeuiButton from "../components/beui/BeuiButton";
import BeuiBadge from "../components/beui/BeuiBadge";
import { BeuiCard, BeuiInput } from "../components/beui/beui";
import MapView from "../components/MapView";
import { useGeolocation, reverseGeocodeAddress, COUNTRY_CENTER } from "../services/geo";
import { useSession } from "../lib/session";
import { callFunction, sha256Hex, uploadReportPhoto } from "../lib/appwrite";
import { friendlyError } from "../lib/errors";
import { cn } from "../lib/cn";

const DEPTHS = [
  { label: "Ankle-deep", value: "ankle" },
  { label: "Knee-deep", value: "knee" },
  { label: "Waist-deep", value: "waist" },
  { label: "Road closed", value: "road_closed" },
];
const STEPS = [
  { n: 1, t: "Location", icon: MapPin },
  { n: 2, t: "Details", icon: Camera },
  { n: 3, t: "Review", icon: ClipboardCheck },
];

export default function Report() {
  const nav = useNavigate();
  const { user } = useSession();
  const [step, setStep] = useState(1);
  const [depth, setDepth] = useState("knee");
  const [photo, setPhoto] = useState(null);
  const [note, setNote] = useState("");
  const [pin, setPin] = useState({ lat: COUNTRY_CENTER[0], lng: COUNTRY_CENTER[1] });
  const [pinLabel, setPinLabel] = useState("Bangladesh. Drag the pin or tap the map.");
  const [pinResolving, setPinResolving] = useState(false);
  const [placedByUser, setPlacedByUser] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const lookupId = useRef(0);
  const addressRef = useRef({ division: "unknown", district: undefined });
  const geo = useGeolocation(true);

  const resolvePinLabel = (ll, immediate) => {
    const id = ++lookupId.current;
    setPinResolving(true);
    if (immediate) setPinLabel(immediate);
    reverseGeocodeAddress(ll.lat, ll.lng)
      .then(({ label, division, district }) => {
        if (lookupId.current === id) {
          setPinLabel(label);
          addressRef.current = { division, district };
        }
      })
      .catch(() => {
        if (lookupId.current === id) {
          setPinLabel(`${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`);
          addressRef.current = { division: "unknown", district: undefined };
        }
      })
      .finally(() => { if (lookupId.current === id) setPinResolving(false); });
  };

  // Adopt the GPS fix unless the user already placed the pin by hand.
  useEffect(() => {
    if (geo.pos && !placedByUser) {
      setPin(geo.pos);
      resolvePinLabel(geo.pos, "Your current location");
      setFitSignal((s) => s + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.pos, placedByUser]);

  const movePin = (ll) => {
    setPlacedByUser(true);
    setPin(ll);
    resolvePinLabel(ll);
  };

  const submit = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const imageHash = photo ? await sha256Hex(photo) : undefined;
      const uploaded = photo ? await uploadReportPhoto(photo, user.$id) : null;
      const { division, district } = addressRef.current;
      await callFunction("submit-report", {
        placeLabel: pinLabel,
        division,
        district,
        lat: pin.lat,
        lng: pin.lng,
        depth,
        note: note.trim() || undefined,
        imageFileIds: uploaded ? [uploaded.$id] : undefined,
        imageHash,
      });
      nav("/my-reports");
    } catch (ex) {
      console.error("[report] submit failed:", ex?.code ?? ex?.message ?? ex);
      setSubmitError(friendlyError(ex, "Could not file the report. Please try again."));
      setSubmitting(false);
    }
  };

  const precise = placedByUser || !!geo.pos;
  const pinPos = [pin.lat, pin.lng];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight sm:text-[30px]">Report waterlogging</h1>
        <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">Three quick steps. Verified reports update the map; false ones are discarded.</p>
      </div>

      <ol className="grid grid-cols-3 gap-2" aria-label="Report progress">
        {STEPS.map((s) => {
          const active = step === s.n, past = step > s.n;
          return (
            <li key={s.n} className={cn("flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[13.5px] font-bold",
              active ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : past ? "border-teal-600/30 bg-teal-50 text-teal-900 dark:border-teal-400/30 dark:bg-white/5 dark:text-teal-300" : "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-transparent dark:text-slate-400")}>
              {past ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              {s.n}. {s.t}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <BeuiCard className="p-5 sm:p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="h-[320px] overflow-hidden rounded-2xl">
                <MapView
                  center={pinPos}
                  zoom={precise ? 15 : 7}
                  pin={{ pos: pinPos }}
                  onPinMove={movePin}
                  onMapClick={movePin}
                  fitSignal={fitSignal}
                  chip={pinResolving ? "Resolving address…" : pinLabel}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BeuiBadge tone={precise ? "safe" : "caution"}>{pinResolving ? "Resolving…" : pinLabel}</BeuiBadge>
                <button type="button" onClick={geo.locate} className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl px-2 text-[13px] font-bold text-teal-800 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-white/5">
                  <LocateFixed className="h-4 w-4" aria-hidden="true" />
                  {geo.status === "locating" ? "Locating…" : "Re-center on me"}
                </button>
              </div>
              {geo.error && !precise && <p className="text-[13px] text-slate-500 dark:text-slate-400">{geo.error} Tap the map to place the pin by hand.</p>}
              <BeuiInput
                label="Pinned location"
                hint="Tap the map, drag the pin, or use your GPS. Works anywhere in Bangladesh."
                value={`${pinLabel}, ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}
                readOnly
              />
              <BeuiButton onClick={() => setStep(2)} className="w-full">Confirm location →</BeuiButton>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <span className="mb-2 block text-[13.5px] font-semibold">Water depth</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DEPTHS.map((d) => (
                    <motion.button key={d.value} type="button" onClick={() => setDepth(d.value)} aria-pressed={depth === d.value} whileTap={{ scale: 0.96 }}
                      className={cn("min-h-[52px] cursor-pointer rounded-2xl border-2 px-3 text-[13.5px] font-bold transition-colors",
                        depth === d.value ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-400 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:border-white/30")}>{d.label}</motion.button>
                  ))}
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-[13.5px] font-semibold">Photo evidence</span>
                <label className="flex min-h-[130px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition-colors hover:border-teal-600 hover:bg-teal-50/50 dark:border-white/15 dark:bg-white/5 dark:hover:border-teal-400">
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                  <Camera className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                  <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">{photo ? `Attached: ${photo.name}` : "Tap to add photo"}</span>
                  <span className="text-[12.5px] text-slate-500 dark:text-slate-400">JPG or PNG. A photo helps verification.</span>
                </label>
              </div>
              <BeuiInput label="Short note" placeholder="e.g. Knee-deep, rickshaws stuck, bikes passable left lane" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
              <div className="flex gap-3">
                <BeuiButton variant="ghost" onClick={() => setStep(1)}>← Back</BeuiButton>
                <BeuiButton onClick={() => setStep(3)} className="flex-1">Review report →</BeuiButton>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center justify-between gap-2"><p className="font-bold">{pinLabel || "Pinned location"}</p><BeuiBadge tone="caution">Enters queue</BeuiBadge></div>
                <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">Depth: <b>{DEPTHS.find((d) => d.value === depth)?.label}</b> · Photo: <b>{photo ? photo.name : "none"}</b> · {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</p>
                <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">Goes to the verification queue when you submit.</p>
              </div>
              {submitError && <p className="text-[13px] font-semibold text-red-600 dark:text-red-400" role="alert">{submitError}</p>}
              <div className="flex gap-3">
                <BeuiButton variant="ghost" onClick={() => setStep(2)}>← Edit</BeuiButton>
                <BeuiButton onClick={submit} className="flex-1" disabled={submitting}>{submitting ? "Submitting…" : "Submit report"}</BeuiButton>
              </div>
            </div>
          )}
        </BeuiCard>

        <div className="space-y-3">
          <BeuiCard className="p-5">
            <h3 className="text-[15px] font-bold">What happens next?</h3>
            <ol className="mt-3 space-y-3 text-[13.5px]">
              {[["Queue", "Joins verification with GPS plus photo.", "caution"], ["Verification", "The verification team plus nearby confirmations.", "neutral"], ["Verified", "Road turns yellow or red, and reroutes push out.", "safe"], ["False reports", "Fakes are removed and the reporter is warned.", "danger"]].map(([t, d, tone]) => (
                <li key={t} className="flex gap-2.5"><BeuiBadge tone={tone}>{t.split(" ")[0]}</BeuiBadge><span><b>{t}.</b> <span className="text-slate-600 dark:text-slate-400">{d}</span></span></li>
              ))}
            </ol>
          </BeuiCard>
          <BeuiCard className="!border-slate-800 !bg-slate-900 p-5 !text-white">
            <p className="text-[14px] font-bold text-teal-200">Tip for fast verification</p>
            <p className="mt-1 text-[13.5px] text-slate-200">Include a landmark plus water against a wheel or curb. Reports are reviewed in the order received.</p>
          </BeuiCard>
        </div>
      </div>
    </div>
  );
}
