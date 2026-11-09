import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut, Check, X, Flag, Inbox, UserRoundX, RefreshCw } from "lucide-react";
import { cn } from "../../../shared/cn";
import ThemeToggle from "../components/ThemeToggle";
import { useOperator } from "../lib/operator";
import { tablesDB, storage, DATABASE_ID, TABLES, BUCKET, Query, callFunction } from "../lib/appwrite";
import { friendlyError } from "../lib/errors";

const MAIN_SITE = import.meta.env.VITE_MAIN_SITE_URL || "http://localhost:5173";

const DEPTH_LABEL = { ankle: "ankle-deep", knee: "knee-deep", waist: "waist-deep", road_closed: "road closed" };
const STATUS_LABEL = { pending: "Pending", verified: "Verified", discarded: "Discarded", flagged_abuse: "Flagged as Abuse" };

const toneBadge = (s) =>
  s === "Verified"
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : s === "Discarded" || s === "Flagged as Abuse"
      ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hrs ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

function fmtMinutes(m) {
  if (m === null || m === undefined) return "–";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

// Redirect from an effect, not during render: navigating mid-render blanks the tree.
function RedirectToLogin() {
  const nav = useNavigate();
  useEffect(() => {
    nav("/login", { replace: true });
  }, [nav]);
  return null;
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const { user, checks, logout: signOut } = useOperator();
  const [reports, setReports] = useState(null); // null = loading
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");
  const [acting, setActing] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [r, e] = await Promise.all([
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLES.reports,
          queries: [Query.orderDesc("$createdAt"), Query.limit(50)],
          total: false,
        }),
        tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: TABLES.auditEvents,
          queries: [Query.orderDesc("$createdAt"), Query.limit(30)],
          total: false,
        }),
      ]);
      setReports(r.rows);
      setEvents(e.rows);
    } catch (err) {
      console.error("[console] load failed:", err?.code ?? err?.message ?? err);
      setError(friendlyError(err, "Could not load the operations data. Please try again."));
    }
  }, []);

  useEffect(() => {
    if (checks === "operator") load();
  }, [checks, load]);

  const stats = useMemo(() => {
    const rows = reports ?? [];
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
    const deltas = rows
      .filter((r) => r.status === "verified" && r.verifiedAt && new Date(r.verifiedAt).getTime() >= monthAgo)
      .map((r) => (new Date(r.verifiedAt) - new Date(r.$createdAt)) / 60000)
      .filter((m) => Number.isFinite(m) && m >= 0)
      .sort((a, b) => a - b);
    return {
      today: rows.filter((r) => new Date(r.$createdAt) >= dayStart).length,
      median: deltas.length ? Math.round(deltas[Math.floor(deltas.length / 2)]) : null,
      pending: rows.filter((r) => r.status === "pending").length,
    };
  }, [reports]);

  const decide = async (id, action) => {
    setActing(id);
    setError("");
    try {
      await callFunction("verify-report", { reportId: id, action });
      await load();
    } catch (ex) {
      console.error("[console] decision failed:", ex?.code ?? ex?.message ?? ex);
      setError(friendlyError(ex, "Could not update the report. Please try again."));
    } finally {
      setActing("");
    }
  };

  const logout = async () => {
    await signOut();
    nav("/login", { replace: true });
  };

  if (checks === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-[14px] font-semibold text-slate-500 dark:text-slate-400">Verifying operator access…</div>;
  }

  if (checks === "signed-out") {
    return <RedirectToLogin />;
  }

  if (checks === "rejected") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-white/10 dark:bg-slate-900">
          <UserRoundX className="mx-auto h-8 w-8 text-red-600" aria-hidden="true" />
          <h1 className="mt-3 text-[18px] font-bold">Not an operator</h1>
          <p className="mt-1 text-[13.5px] text-slate-600 dark:text-slate-400">
            Signed in as {user?.email ?? "unknown"}, but this account is not in the operators team.
            Ask an admin to add you, or sign in with an operator account.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={logout} className="min-h-[44px] cursor-pointer rounded-xl bg-teal-700 px-5 text-[14px] font-bold text-white">Sign out</button>
            <a href={MAIN_SITE} className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 px-5 text-[14px] font-semibold dark:border-white/15">Open main app</a>
          </div>
        </div>
      </div>
    );
  }

  const pending = stats.pending;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[16px] font-bold leading-tight">Safeway Console</p>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">Verification for Bangladesh · {user?.email}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href={MAIN_SITE} className="hidden min-h-[44px] items-center rounded-xl border border-slate-200 px-4 text-[14px] font-semibold hover:bg-slate-50 sm:inline-flex dark:border-white/15 dark:hover:bg-white/5">
              View main app
            </a>
            <ThemeToggle />
            <button onClick={logout} className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-slate-950 px-4 text-[14px] font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="mt-1 text-[26px] font-bold tracking-tight">Review queue ({pending} pending)</h1>
            <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">Decisions update the public map and send push alerts.</p>
          </div>
          <button onClick={load} className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:hover:bg-white/5">
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
            {error}
          </div>
        )}

        <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 dark:border-white/10 dark:bg-slate-900">
          {[
            ["Reports today", reports === null ? "…" : String(stats.today)],
            ["Pending", reports === null ? "…" : String(stats.pending)],
            ["Median verify time (30 d)", fmtMinutes(stats.median)],
          ].map(([t, v]) => (
            <div key={t} className="border-l-2 border-slate-200 pl-3 dark:border-white/10">
              <dt className="text-[12px] font-bold tracking-wide text-slate-500 dark:text-slate-400">{t}</dt>
              <dd className="mt-0.5 text-[24px] font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <h2 className="text-[18px] font-bold">Reports from all divisions</h2>
          <div className="mt-3 space-y-3">
            {reports === null && <p className="py-6 text-center text-[13.5px] text-slate-500 dark:text-slate-400">Loading reports…</p>}
            {reports !== null && reports.length === 0 && (
              <p className="py-6 text-center text-[13.5px] text-slate-500 dark:text-slate-400">No reports yet. New public submissions land here.</p>
            )}
            {reports !== null && reports.map((r) => {
              const statusLabel = STATUS_LABEL[r.status] ?? r.status;
              const working = acting === r.$id;
              return (
                <div key={r.$id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  {r.imageFileIds?.[0] ? (
                    <img
                      src={storage.getFileView({ bucketId: BUCKET.reportPhotos, fileId: r.imageFileIds[0] })}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">PHOTO</div>
                  )}
                  <div className="min-w-[200px] flex-1">
                    <p className="text-[15px] font-bold">
                      {r.placeLabel}{" "}
                      <span className="font-mono text-[12px] font-normal text-slate-500 dark:text-slate-400">
                        {r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}
                      </span>
                    </p>
                    <p className="text-[13px] text-slate-500 dark:text-slate-400">
                      {DEPTH_LABEL[r.depth] ?? r.depth} · {r.division}{r.district ? `, ${r.district}` : ""} · {timeAgo(r.$createdAt)}
                      {r.note ? ` · “${r.note}”` : ""}
                    </p>
                  </div>
                  <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-bold", toneBadge(statusLabel))}>{statusLabel}</span>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button disabled={working} onClick={() => decide(r.$id, "verify")} className="pressable inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-[14px] font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                        <Check className="h-4 w-4" aria-hidden="true" /> {working ? "Saving…" : "Verify"}
                      </button>
                      <button disabled={working} onClick={() => decide(r.$id, "flag")} className="pressable inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-amber-300 px-4 text-[14px] font-bold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10">
                        <Flag className="h-4 w-4" aria-hidden="true" /> Flag
                      </button>
                      <button disabled={working} onClick={() => decide(r.$id, "discard")} className="pressable inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 px-4 text-[14px] font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10">
                        <X className="h-4 w-4" aria-hidden="true" /> Discard
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
          <h3 className="flex items-center gap-2 text-[15px] font-bold"><Inbox className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" /> Operations log</h3>
          <div className="mt-3 space-y-2">
            {events.length === 0 && (
              <p className="text-[14px] text-slate-600 dark:text-slate-400">No events yet. Submissions, decisions, and push sends appear here.</p>
            )}
            {events.map((e) => (
              <div key={e.$id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 text-[13px] dark:border-white/10">
                <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">{timeAgo(e.$createdAt)}</span>
                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[12px] font-bold dark:border-white/15">{e.action}</span>
                <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">{e.reportId}</span>
                {e.meta && <span className="text-[12px] text-slate-500 dark:text-slate-400">{e.meta}</span>}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
