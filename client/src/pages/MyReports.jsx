import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BeuiButton from "../components/beui/BeuiButton";
import BeuiBadge from "../components/beui/BeuiBadge";
import { BeuiCard } from "../components/beui/beui";
import { BeuiTabs, BeuiTabsList, BeuiTab } from "../components/beui/BeuiTabs";
import { useSession } from "../lib/session";
import { tablesDB, DATABASE_ID, TABLES, Query, depthLabel, shortReportId } from "../lib/appwrite";

const STATUS_META = {
  pending: { label: "Pending review", tone: "caution" },
  verified: { label: "Verified", tone: "danger" },
  discarded: { label: "Discarded", tone: "neutral" },
  flagged_abuse: { label: "Flagged as abuse", tone: "danger" },
};

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hrs ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export default function MyReports() {
  const { user } = useSession();
  const [filter, setFilter] = useState("queue");
  const [rows, setRows] = useState(null); // null = loading
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let live = true;
    tablesDB
      .listRows({
        databaseId: DATABASE_ID,
        tableId: TABLES.reports,
        queries: [Query.equal("reporterId", user.$id), Query.orderDesc("$createdAt"), Query.limit(50)],
        total: false,
      })
      .then((res) => { if (live) setRows(res.rows); })
      .catch(() => { if (live) { setRows([]); setError("Could not load your reports. Pull to retry."); } });
    return () => { live = false; };
  }, [user]);

  const shown = useMemo(() => {
    const all = rows ?? [];
    if (filter === "all") return all;
    if (filter === "queue") return all.filter((r) => r.status === "pending");
    return all.filter((r) => r.status !== "pending"); // verified/decided
  }, [rows, filter]);

  const queue = (rows ?? []).filter((r) => r.status === "pending");
  const past = (rows ?? []).filter((r) => r.status !== "pending");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight sm:text-[30px]">Your reports</h1>
          <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">Submit, queue for review, then see the map update.</p>
        </div>
        <BeuiButton to="/report">Report flooding</BeuiButton>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13.5px] font-semibold text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
          {error}
        </div>
      )}

      <BeuiCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-bold">Verification queue</h2>
          <BeuiTabs value={filter} onValueChange={setFilter}>
            <BeuiTabsList>
              <BeuiTab value="queue">In queue ({queue.length})</BeuiTab>
              <BeuiTab value="verified">Decided ({past.length})</BeuiTab>
              <BeuiTab value="all">All ({(rows ?? []).length})</BeuiTab>
            </BeuiTabsList>
          </BeuiTabs>
        </div>
        <div className="mt-3 space-y-2.5">
          {rows === null && <p className="py-6 text-center text-[13.5px] text-slate-500 dark:text-slate-400">Loading your reports…</p>}
          {rows !== null && shown.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.pending;
            return (
              <div key={r.$id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10">
                <span className="font-mono text-[13px] text-slate-500 dark:text-slate-400">{shortReportId(r.$id)}</span>
                <div className="min-w-[180px] flex-1">
                  <p className="text-[14.5px] font-bold">{r.placeLabel}</p>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400">
                    {depthLabel(r.depth)} · {r.division}{r.district ? `, ${r.district}` : ""} · {timeAgo(r.$createdAt)}
                  </p>
                </div>
                <BeuiBadge tone={meta.tone}>{meta.label}</BeuiBadge>
              </div>
            );
          })}
          {rows !== null && shown.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center dark:border-white/15 dark:bg-white/5">
              <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Nothing here yet</p>
              <p className="mx-auto mt-1 max-w-[46ch] text-[14px] text-slate-600 dark:text-slate-400">
                {filter === "queue" ? "Reports you file land in the verification queue." : "Decided reports appear here once operators review them."}
              </p>
              <div className="mt-4 flex justify-center"><BeuiButton to="/report">Report flooding</BeuiButton></div>
            </div>
          )}
        </div>
      </BeuiCard>

      <BeuiCard className="p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[18px] font-bold">Past submissions</h2>
          <Link to="/navigate" className="text-[13.5px] font-bold text-teal-800 hover:underline dark:text-teal-300">Plan a route</Link>
        </div>
        <div className="overflow-x-auto nice-scroll">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead><tr className="border-b border-slate-200 text-[12px] uppercase tracking-wider text-slate-500 dark:border-white/10 dark:text-slate-400"><th className="py-2 pr-4 font-bold">ID</th><th className="py-2 pr-4 font-bold">Place</th><th className="py-2 pr-4 font-bold">Depth</th><th className="py-2 font-bold">Outcome</th></tr></thead>
            <tbody>
              {(rows ?? []).filter((r) => r.status !== "pending").map((r) => {
                const meta = STATUS_META[r.status] ?? STATUS_META.pending;
                return (
                  <tr key={r.$id} className="border-b border-slate-100 last:border-0 dark:border-white/10">
                    <td className="py-3 pr-4 font-mono text-[13px] text-slate-500 dark:text-slate-400">{shortReportId(r.$id)}</td>
                    <td className="py-3 pr-4 font-semibold">{r.placeLabel}</td>
                    <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{depthLabel(r.depth)}</td>
                    <td className="py-3"><BeuiBadge tone={meta.tone}>{meta.label}</BeuiBadge></td>
                  </tr>
                );
              })}
              {rows !== null && past.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-[13px] text-slate-500 dark:text-slate-400">No decided reports yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </BeuiCard>
    </div>
  );
}
