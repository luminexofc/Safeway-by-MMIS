import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Trash2, TriangleAlert } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { useSession } from "../lib/session";
import {
  tablesDB,
  DATABASE_ID,
  TABLES,
  Query,
  callFunction,
  depthLabel,
  shortReportId,
} from "../lib/appwrite";
import { friendlyError } from "../lib/errors";
import { ReportRowsSkeleton } from "../components/Skeletons";
import { useLang } from "../lib/lang";
import "./my-reports.css";

const COPY = {
  en: {
    status: {
      pending: "Pending review",
      verified: "Verified",
      discarded: "Not verified",
      flagged_abuse: "Under review",
    },
    filters: [
      { value: "queue", label: "In review" },
      { value: "decided", label: "Decided" },
      { value: "all", label: "All" },
    ],
    justNow: "just now",
    minutesAgo: (n) => `${n} ${n === 1 ? "minute" : "minutes"} ago`,
    hoursAgo: (n) => `${n} ${n === 1 ? "hour" : "hours"} ago`,
    daysAgo: (n) => `${n} ${n === 1 ? "day" : "days"} ago`,
    deleteConfirm: (id) => `Delete ${id}? The report and its photo are removed permanently.`,
    deleting: "Deleting…",
    deleteReport: "Delete report",
    keep: "Keep",
    deleteAria: (id) => `Delete report ${id}`,
    deleteTitle: "Delete this report and its photo",
    pageTitle: "Your reports",
    pageDesc: "Everything you have filed, and what an operator has decided about it.",
    reportOccurrence: "Report an occurrence",
    tryAgain: "Try again",
    filterReports: "Filter reports",
    reportsList: "Your reports",
    emptyNoneTitle: "No reports yet",
    emptyNoneDesc: "Reports you file appear here, with their review status, until an operator decides on them.",
    emptyQueueTitle: "Nothing in review",
    emptyQueueDesc: "Every report you filed has been reviewed. New ones wait here until an operator looks at them.",
    emptyDecidedTitle: "No decisions yet",
    emptyDecidedDesc: "Reports appear here once an operator verifies or declines them.",
    emptyOtherTitle: "No reports to show",
    emptyOtherDesc: "No report matches this filter.",
    foot: "A report stays in review until an operator checks it. Only verified reports appear on the safety map, so a pending one changes nothing there yet.",
    loadFailed: "Could not load your reports. Please try again.",
    deleteFailed: "Could not delete this report. Please try again.",
  },
  bn: {
    status: {
      pending: "যাচাইয়ের অপেক্ষায়",
      verified: "যাচাইকৃত",
      discarded: "যাচাই হয়নি",
      flagged_abuse: "পর্যালোচনাধীন",
    },
    filters: [
      { value: "queue", label: "যাচাই চলছে" },
      { value: "decided", label: "সিদ্ধান্ত হয়েছে" },
      { value: "all", label: "সব" },
    ],
    justNow: "এইমাত্র",
    minutesAgo: (n) => `${n} মিনিট আগে`,
    hoursAgo: (n) => `${n} ঘণ্টা আগে`,
    daysAgo: (n) => `${n} দিন আগে`,
    deleteConfirm: (id) => `${id} মুছে ফেলবেন? রিপোর্ট ও এর ছবি স্থায়ীভাবে মুছে যাবে।`,
    deleting: "মুছে ফেলা হচ্ছে…",
    deleteReport: "রিপোর্ট মুছুন",
    keep: "রাখুন",
    deleteAria: (id) => `${id} রিপোর্টটি মুছুন`,
    deleteTitle: "এই রিপোর্ট ও এর ছবি মুছে ফেলুন",
    pageTitle: "আপনার রিপোর্ট",
    pageDesc: "আপনি যা জমা দিয়েছেন এবং অপারেটর তার বিষয়ে কী সিদ্ধান্ত নিয়েছেন।",
    reportOccurrence: "ঘটনা জানান",
    tryAgain: "আবার চেষ্টা",
    filterReports: "রিপোর্ট ফিল্টার করুন",
    reportsList: "আপনার রিপোর্ট",
    emptyNoneTitle: "এখনো কোনো রিপোর্ট নেই",
    emptyNoneDesc: "আপনি যে রিপোর্ট জমা দেন তা যাচাইয়ের অবস্থাসহ এখানে দেখা যাবে, অপারেটর সিদ্ধান্ত না নেওয়া পর্যন্ত।",
    emptyQueueTitle: "যাচাইয়ের জন্য কিছু নেই",
    emptyQueueDesc: "আপনার জমা দেওয়া সব রিপোর্ট যাচাই হয়েছে। নতুন রিপোর্ট অপারেটর দেখার আগে এখানে অপেক্ষা করবে।",
    emptyDecidedTitle: "এখনো কোনো সিদ্ধান্ত নেই",
    emptyDecidedDesc: "অপারেটর যাচাই বা বাতিল করার পর রিপোর্ট এখানে দেখা যাবে।",
    emptyOtherTitle: "দেখানোর মতো রিপোর্ট নেই",
    emptyOtherDesc: "এই ফিল্টারে কোনো রিপোর্ট মেলে না।",
    foot: "অপারেটর যাচাই না করা পর্যন্ত রিপোর্ট যাচাইয়ের সারিতে থাকে। কেবল যাচাইকৃত রিপোর্ট নিরাপত্তা মানচিত্রে দেখায়, তাই অপেক্ষমাণ রিপোর্টে মানচিত্র এখনো বদলায় না।",
    loadFailed: "আপনার রিপোর্ট লোড করা যায়নি। আবার চেষ্টা করুন।",
    deleteFailed: "এই রিপোর্ট মুছে ফেলা যায়নি। আবার চেষ্টা করুন।",
  },
};

function timeAgo(iso, copy) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return copy.justNow;
  if (s < 3600) return copy.minutesAgo(Math.floor(s / 60));
  if (s < 86400) return copy.hoursAgo(Math.floor(s / 3600));
  return copy.daysAgo(Math.floor(s / 86400));
}

function ReportRow({
  report,
  showStatus,
  confirming,
  deleting,
  error,
  keepRef,
  copy,
  onConfirm,
  onCancel,
  onDelete,
}) {
  const place = report.district ? `${report.division}, ${report.district}` : report.division;

  return (
    <li className="myr-row">
      {confirming ? (
        <div className="myr-confirm">
          <p className="myr-confirm-text">
            {copy.deleteConfirm(shortReportId(report.$id))}
          </p>
          <div className="myr-confirm-actions">
            <button
              type="button"
              className="myr-btn myr-btn--danger"
              onClick={onDelete}
              disabled={deleting}
              aria-busy={deleting}
            >
              {deleting ? copy.deleting : copy.deleteReport}
            </button>
            <button
              type="button"
              ref={keepRef}
              className="myr-btn myr-btn--ghost"
              onClick={onCancel}
              disabled={deleting}
            >
              {copy.keep}
            </button>
          </div>
          {error && (
            <p className="myr-row-notice" role="alert">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              {error}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="myr-row-main">
            <div className="myr-row-head">
              <h3 className="myr-place">{report.placeLabel}</h3>
              {showStatus && (
                <span className="myr-status">
                  {copy.status[report.status] ?? copy.status.pending}
                </span>
              )}
            </div>
            <p className="myr-meta">
              <span className="myr-id">{shortReportId(report.$id)}</span>
              {report.depth && <span>{depthLabel(report.depth)}</span>}
              {place && report.division !== "unknown" && <span>{place}</span>}
              <span>{timeAgo(report.$createdAt, copy)}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label={copy.deleteAria(shortReportId(report.$id))}
            title={copy.deleteTitle}
            onClick={onConfirm}
            className="myr-icon-btn"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
    </li>
  );
}

export default function MyReports() {
  const { user } = useSession();
  const [lang] = useLang();
  const copy = COPY[lang] || COPY.en;
  const FILTERS = copy.filters;
  const [filter, setFilter] = useState("queue");
  const [rows, setRows] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const keepRef = useRef(null);

  const removeReport = async (id) => {
    if (deletingId) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      await callFunction("submit-report", { action: "report", reportId: id });
      setRows((prev) => (prev ?? []).filter((r) => r.$id !== id));
      setConfirmId(null);
    } catch (err) {
      console.error("[my-reports] delete failed:", err?.code ?? err?.message ?? err);
      setDeleteError(friendlyError(err, copy.deleteFailed, lang));
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    let live = true;
    tablesDB
      .listRows({
        databaseId: DATABASE_ID,
        tableId: TABLES.reports,
        queries: [
          Query.equal("reporterId", user.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ],
        total: false,
      })
      .then((res) => {
        if (live) setRows(res.rows);
      })
      .catch((err) => {
        console.error("[my-reports] load failed:", err?.code ?? err?.message ?? err);
        if (live) {
          setRows([]);
          setError(friendlyError(err, copy.loadFailed, lang));
        }
      });
    return () => {
      live = false;
    };
  }, [user, reloadKey, copy.loadFailed, lang]);

  // Opening the confirm moves focus to the safe choice, not the destructive one.
  useEffect(() => {
    if (confirmId) keepRef.current?.focus();
  }, [confirmId]);

  const all = rows ?? [];
  const queue = all.filter((r) => r.status === "pending");
  const decided = all.filter((r) => r.status !== "pending");

  const shown = filter === "all" ? all : filter === "queue" ? queue : decided;
  const countFor = (value) =>
    value === "all" ? all.length : value === "queue" ? queue.length : decided.length;

  return (
    <div className="myr">
      <PageHeader
        title={copy.pageTitle}
        description={copy.pageDesc}
        actions={
          <Link className="myr-btn myr-btn--primary" to="/report">
            {copy.reportOccurrence}
          </Link>
        }
      />

      {error && (
        <div className="myr-notice" role="alert">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          <p>{error}</p>
          <button
            type="button"
            className="myr-btn myr-btn--ghost"
            onClick={() => {
              setRows(null);
              setError("");
              setReloadKey((k) => k + 1);
            }}
          >
            {copy.tryAgain}
          </button>
        </div>
      )}

      <div className="myr-filters" role="group" aria-label={copy.filterReports}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className="myr-filter"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            <span className="myr-filter-count">{countFor(f.value)}</span>
          </button>
        ))}
      </div>

      {rows === null ? (
        <ReportRowsSkeleton />
      ) : (
        <ul className="myr-list" aria-label={copy.reportsList}>
          {shown.map((r) => (
            <ReportRow
              key={r.$id}
              report={r}
              showStatus={filter !== "queue"}
              confirming={confirmId === r.$id}
              deleting={deletingId === r.$id}
              error={confirmId === r.$id ? deleteError : ""}
              keepRef={keepRef}
              copy={copy}
              onConfirm={() => {
                setConfirmId(r.$id);
                setDeleteError("");
              }}
              onCancel={() => {
                setConfirmId(null);
                setDeleteError("");
              }}
              onDelete={() => removeReport(r.$id)}
            />
          ))}

          {shown.length === 0 && (
            <li className="myr-empty">
              <span className="myr-empty-icon" aria-hidden="true">
                <FileText className="h-5 w-5" />
              </span>
              <p className="myr-empty-title">
                {all.length === 0
                  ? copy.emptyNoneTitle
                  : filter === "queue"
                    ? copy.emptyQueueTitle
                    : filter === "decided"
                      ? copy.emptyDecidedTitle
                      : copy.emptyOtherTitle}
              </p>
              <p className="myr-empty-desc">
                {all.length === 0
                  ? copy.emptyNoneDesc
                  : filter === "queue"
                    ? copy.emptyQueueDesc
                    : filter === "decided"
                      ? copy.emptyDecidedDesc
                      : copy.emptyOtherDesc}
              </p>
              {all.length === 0 && (
                <Link className="myr-btn myr-btn--primary" to="/report">
                  {copy.reportOccurrence}
                </Link>
              )}
            </li>
          )}
        </ul>
      )}

      {rows !== null && filter === "queue" && shown.length > 0 && (
        <p className="myr-foot">{copy.foot}</p>
      )}
    </div>
  );
}
