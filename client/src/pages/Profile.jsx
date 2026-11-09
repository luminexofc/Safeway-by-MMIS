import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import { useSession } from "../lib/session";
import { account, getProfile, upsertProfile, tablesDB, DATABASE_ID, TABLES } from "../lib/appwrite";
import { friendlyError } from "../lib/errors";
import BeuiButton from "../components/beui/BeuiButton";
import PageHeader from "../components/PageHeader";
import BeuiBadge from "../components/beui/BeuiBadge";
import { BeuiCard, BeuiInput } from "../components/beui/beui";

export default function Profile() {
  const { user, refresh } = useSession();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleted, setDeleted] = useState(false);

  // Seed the form from the profiles table (fallback: auth name).
  useEffect(() => {
    if (!user) return;
    getProfile(user.$id)
      .then((p) => {
        setName(p?.displayName ?? user.name ?? "");
        setPhone(p?.phone ?? "");
      })
      .catch(() => setName(user.name ?? ""));
  }, [user]);

  const initial = name.trim() ? name.trim()[0].toUpperCase() : null;

  const save = async (e) => {
    e.preventDefault();
    if (!user || saving) return;
    setSaving(true);
    setSaved("");
    try {
      const data = { displayName: name.trim() || undefined, phone: phone.trim() || undefined };
      await upsertProfile(user, data);
      if (name.trim() && name.trim() !== user.name) {
        await account.updateName({ name: name.trim() }).catch(() => {});
        await refresh();
      }
      setSaved("Saved");
    } catch (err) {
      console.error("[profile] save failed:", err?.code ?? err?.message ?? err);
      setSaved(friendlyError(err, "Could not save. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!user || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      // Reports reference reporterId as a plain string, so they survive
      // untouched (map shows location only, never identity).
      await tablesDB
        .deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.profiles, rowId: user.$id })
        .catch((e) => { if (e?.code !== 404) throw e; });
      // Permanently blocks the account (client SDK cannot hard-delete).
      await account.updateStatus();
      setDeleted(true);
    } catch (err) {
      console.error("[profile] delete failed:", err?.code ?? err?.message ?? err);
      setDeleteError(friendlyError(err, "Could not delete your account. Please try again or contact support."));
      setDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl bg-slate-50 p-6 text-center dark:bg-white/5" role="status">
          <p className="text-[15px] font-bold text-slate-800 dark:text-slate-100">Account deleted</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-[13.5px] text-slate-600 dark:text-slate-400">
            Your profile is gone and the account can no longer sign in. Your reports stay on the map without your name.
          </p>
          <div className="mt-4 flex justify-center">
            <BeuiButton onClick={() => nav("/login")}>Back to sign in</BeuiButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Profile" description="Your identity in the app and your account. Nothing here is shared publicly." />

      <BeuiCard className="p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white" aria-hidden="true">
            {initial ? (
              <span className="text-[24px] font-bold">{initial}</span>
            ) : (
              <User className="h-7 w-7" />
            )}
          </span>
          <div>
            <h2 className="text-[16px] font-bold">{name.trim() || "Your name"}</h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">Initial avatar, generated from your name.</p>
          </div>
        </div>
        <form onSubmit={save}>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <BeuiInput label="Display name" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <BeuiInput label="Email" placeholder="you@example.com" value={user?.email ?? ""} readOnly />
          </div>
          <div className="mt-4">
            <BeuiInput label="Phone" placeholder="+880 1XXX-XXXXXX" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <BeuiButton type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</BeuiButton>
            {saved && <BeuiBadge tone={saved === "Saved" ? "safe" : "danger"}>{saved}</BeuiBadge>}
          </div>
        </form>
      </BeuiCard>

      <BeuiCard className="p-6">
        <h2 className="text-[16px] font-bold">Account</h2>
        <Link to="/my-reports" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 transition-colors hover:border-teal-700 hover:bg-teal-50/50 dark:border-white/10 dark:hover:border-teal-400 dark:hover:bg-white/5">
          <span><span className="block text-[15px] font-bold">Your reports</span><span className="block text-[13px] text-slate-500 dark:text-slate-400">Queue status and past submissions</span></span>
        </Link>
        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-white/10">
          <h3 className="text-[15px] font-bold text-red-700 dark:text-red-400">Delete account</h3>
          <p className="mt-1 text-[14px] text-slate-600 dark:text-slate-400">Deletes your profile. Your reports stay on the map without your name.</p>
          {!confirmDelete ? (
            <div className="mt-3"><BeuiButton variant="danger" onClick={() => setConfirmDelete(true)}>Delete my account</BeuiButton></div>
          ) : (
            <div className="mt-3 rounded-2xl bg-red-50 p-4 dark:bg-red-500/10">
              <p className="text-[14px] font-bold text-red-800 dark:text-red-300">Type DELETE to confirm</p>
              <div className="mt-2 flex gap-2">
                <BeuiInput placeholder="DELETE" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                <BeuiButton variant="danger" onClick={doDelete} disabled={confirmText.trim() !== "DELETE" || deleting}>
                  {deleting ? "Deleting…" : "Confirm"}
                </BeuiButton>
              </div>
              {deleteError && <p className="mt-2 text-[13px] font-semibold text-red-700 dark:text-red-300" role="alert">{deleteError}</p>}
              <button onClick={() => setConfirmDelete(false)} className="mt-2 cursor-pointer text-[13px] font-bold underline">Cancel</button>
            </div>
          )}
        </div>
      </BeuiCard>
    </div>
  );
}
