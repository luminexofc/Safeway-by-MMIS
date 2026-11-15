import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Camera, TriangleAlert, User, X } from "lucide-react";
import { useSession } from "../lib/session";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  account,
  callFunction,
  deleteAvatar,
  getAvatarFileId,
  getProfile,
  makeSquareThumbnail,
  setAvatarFileId as persistAvatarFileId,
  uploadAvatar,
  upsertProfile,
} from "../lib/appwrite";
import { friendlyError } from "../lib/errors";
import PageHeader from "../components/PageHeader";
import { ProfileCardSkeleton } from "../components/Skeletons";
import { useLang } from "../lib/lang";
import "./profile.css";

const COPY = {
  en: {
    title: "Profile",
    desc: "Your name and sign-in address. Nothing here is public.",
    changePicture: "Change profile picture",
    addPicture: "Add profile picture",
    noName: "No display name",
    working: "Working…",
    changePhoto: "Change photo",
    addPhoto: "Add photo",
    remove: "Remove",
    photoHint: "JPG, PNG or WebP, up to 2 MB. Only you can see it.",
    chooseImage: "Choose a JPG, PNG or WebP image.",
    tooLarge: "That image is larger than 2 MB. Pick a smaller one.",
    pictureUpdated: "Profile picture updated.",
    pictureFailed: "Could not update your picture. Please try again.",
    pictureRemoved: "Profile picture removed.",
    removeFailed: "Could not remove your picture. Please try again.",
    details: "Your details",
    loadError: "Your saved details did not load, so editing is paused. Reloading first keeps you from overwriting them with blanks.",
    reloadDetails: "Reload details",
    displayName: "Display name",
    nameHint: "Shown in the app navigation.",
    email: "Email",
    emailHint: "This is how you sign in. It cannot be changed here.",
    saving: "Saving…",
    saveDetails: "Save details",
    saved: "Saved.",
    saveFailed: "Could not save your details. Try again in a moment.",
    noChanges: "No changes to save.",
    account: "Account",
    yourReports: "Your reports",
    yourReportsDesc: "Queue status and past submissions",
    privacyPolicy: "Privacy policy",
    privacyDesc: "What is stored, and who can read it",
    deleteAccount: "Delete account",
    deleteText: "Removes your profile, your reports and their photos. There is no restore.",
    typeDelete: "Type DELETE to confirm",
    deleteHint: "This deletes the account for good. Press Escape to cancel.",
    deleting: "Deleting…",
    deletePermanently: "Delete permanently",
    keepAccount: "Keep my account",
    deleteFailed: "Could not delete your account. Nothing was removed — try again.",
    deletedTitle: "Account deleted",
    deletedText: "Your profile, your reports and their photos are gone. This cannot be undone.",
    deletedNote: "This device still holds the old session. Sign out to close it.",
    signOut: "Sign out",
  },
  bn: {
    title: "প্রোফাইল",
    desc: "আপনার নাম ও লগইনের ঠিকানা। এখানকার কিছুই পাবলিক নয়।",
    changePicture: "প্রোফাইল ছবি বদলান",
    addPicture: "প্রোফাইল ছবি যোগ করুন",
    noName: "কোনো প্রদর্শিত নাম নেই",
    working: "কাজ চলছে…",
    changePhoto: "ছবি বদলান",
    addPhoto: "ছবি যোগ করুন",
    remove: "সরান",
    photoHint: "JPG, PNG বা WebP, সর্বোচ্চ ২ MB। কেবল আপনি এটি দেখতে পারেন।",
    chooseImage: "JPG, PNG বা WebP ছবি বাছুন।",
    tooLarge: "ছবিটি ২ MB-এর বেশি। ছোট একটি বাছুন।",
    pictureUpdated: "প্রোফাইল ছবি হালনাগাদ হয়েছে।",
    pictureFailed: "আপনার ছবি হালনাগাদ করা যায়নি। আবার চেষ্টা করুন।",
    pictureRemoved: "প্রোফাইল ছবি সরানো হয়েছে।",
    removeFailed: "আপনার ছবি সরানো যায়নি। আবার চেষ্টা করুন।",
    details: "আপনার তথ্য",
    loadError: "আপনার সংরক্ষিত তথ্য লোড হয়নি, তাই সম্পাদনা বন্ধ আছে। আগে রিলোড করলে খালি মান দিয়ে তা মুছে যাওয়া থেকে বাঁচবে।",
    reloadDetails: "তথ্য আবার লোড করুন",
    displayName: "প্রদর্শিত নাম",
    nameHint: "অ্যাপের নেভিগেশনে দেখানো হয়।",
    email: "ইমেইল",
    emailHint: "এটি দিয়ে আপনি লগইন করেন। এখান থেকে এটি বদলানো যায় না।",
    saving: "সংরক্ষণ হচ্ছে…",
    saveDetails: "তথ্য সংরক্ষণ করুন",
    saved: "সংরক্ষিত হয়েছে।",
    saveFailed: "আপনার তথ্য সংরক্ষণ করা যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।",
    noChanges: "সংরক্ষণের মতো কোনো পরিবর্তন নেই।",
    account: "অ্যাকাউন্ট",
    yourReports: "আপনার রিপোর্ট",
    yourReportsDesc: "যাচাইয়ের অবস্থা ও আগের জমা",
    privacyPolicy: "গোপনীয়তা নীতি",
    privacyDesc: "কী সংরক্ষিত হয় এবং কে তা পড়তে পারে",
    deleteAccount: "অ্যাকাউন্ট মুছুন",
    deleteText: "আপনার প্রোফাইল, রিপোর্ট ও সেগুলোর ছবি মুছে যায়। ফিরিয়ে আনার উপায় নেই।",
    typeDelete: "নিশ্চিত করতে DELETE লিখুন",
    deleteHint: "এতে অ্যাকাউন্ট স্থায়ীভাবে মুছে যাবে। বাতিল করতে Escape চাপুন।",
    deleting: "মুছে ফেলা হচ্ছে…",
    deletePermanently: "স্থায়ীভাবে মুছুন",
    keepAccount: "অ্যাকাউন্ট রেখে দিন",
    deleteFailed: "আপনার অ্যাকাউন্ট মুছে ফেলা যায়নি। কিছুই মুছেনি — আবার চেষ্টা করুন।",
    deletedTitle: "অ্যাকাউন্ট মুছে ফেলা হয়েছে",
    deletedText: "আপনার প্রোফাইল, রিপোর্ট ও সেগুলোর ছবি আর নেই। এটি ফেরানো যাবে না।",
    deletedNote: "এই ডিভাইসে পুরোনো সেশন এখনো আছে। বন্ধ করতে সাইন আউট করুন।",
    signOut: "সাইন আউট",
  },
};

export default function Profile() {
  const { user, avatar, refresh, logout, setAvatarFileId } = useSession();
  const nav = useNavigate();
  const [lang] = useLang();
  const copy = COPY[lang] || COPY.en;

  const [name, setName] = useState("");
  // The values as last stored, so the form can tell a draft from an edit.
  const [baseline, setBaseline] = useState({ name: "" });
  const [load, setLoad] = useState("loading"); // loading | ready | error
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null); // { kind: "ok" | "error", text }
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null); // { kind, text }
  const [avatarBroken, setAvatarBroken] = useState(false);

  const avatarInputRef = useRef(null);
  const deleteTriggerRef = useRef(null);
  const confirmInputRef = useRef(null);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getProfile(user.$id)
      .then((p) => {
        if (!active) return;
        const nextName = p?.displayName ?? user.name ?? "";
        setName(nextName);
        setBaseline({ name: nextName.trim() });
        setLoad("ready");
      })
      .catch(() => {
        // Editing on top of unknown values would overwrite them on save.
        if (active) setLoad("error");
      });
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  // Opening the confirm puts the cursor where the work is; closing puts it back
  // on the button that opened it instead of dropping focus into the page.
  useEffect(() => {
    if (confirming) {
      wasConfirming.current = true;
      confirmInputRef.current?.focus();
    } else if (wasConfirming.current) {
      wasConfirming.current = false;
      deleteTriggerRef.current?.focus();
    }
  }, [confirming]);

  const trimmedName = name.trim();
  const dirty = trimmedName !== baseline.name;
  const initial = trimmedName ? trimmedName[0].toUpperCase() : null;
  const canEdit = load === "ready" && !deleting;

  const editName = (value) => {
    setName(value);
    setSaveMsg(null);
  };

  const reload = () => {
    setLoad("loading");
    setReloadKey((k) => k + 1);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!user || saving || !dirty || !canEdit) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      await upsertProfile(user, {
        displayName: trimmedName || undefined,
      });
      if (trimmedName && trimmedName !== user.name) {
        await account.updateName({ name: trimmedName }).catch(() => {});
        await refresh();
      }
      setBaseline({ name: trimmedName });
      setSaveMsg({ kind: "ok", text: copy.saved });
    } catch (err) {
      console.error("[profile] save failed:", err?.code ?? err?.message ?? err);
      setSaveMsg({
        kind: "error",
        text: friendlyError(err, copy.saveFailed, lang),
      });
    } finally {
      setSaving(false);
    }
  };

  const pickAvatar = () => {
    if (avatarBusy) return;
    avatarInputRef.current?.click();
  };

  const onAvatarChosen = async (e) => {
    const file = e.target.files?.[0];
    // Allow re-picking the same file later.
    e.target.value = "";
    if (!file) return;

    setAvatarMsg(null);
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarMsg({ kind: "error", text: copy.chooseImage });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarMsg({ kind: "error", text: copy.tooLarge });
      return;
    }

    setAvatarBusy(true);
    try {
      const thumb = await makeSquareThumbnail(file);
      const uploaded = await uploadAvatar(thumb, user.$id);
      // Read fresh: another tab may have already replaced the picture.
      const previous = await getAvatarFileId();
      await persistAvatarFileId(uploaded.$id);
      setAvatarFileId(uploaded.$id);
      setAvatarBroken(false);
      // Only now that the new picture is live is the old one disposable.
      if (previous && previous !== uploaded.$id) await deleteAvatar(previous);
      setAvatarMsg({ kind: "ok", text: copy.pictureUpdated });
    } catch (err) {
      console.error("[profile] avatar upload failed:", err?.code ?? err?.message ?? err);
      setAvatarMsg({
        kind: "error",
        text: friendlyError(err, copy.pictureFailed, lang),
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    if (avatarBusy) return;
    setAvatarBusy(true);
    setAvatarMsg(null);
    try {
      const current = await getAvatarFileId();
      await persistAvatarFileId(null);
      setAvatarFileId(null);
      setAvatarBroken(false);
      if (current) await deleteAvatar(current);
      setAvatarMsg({ kind: "ok", text: copy.pictureRemoved });
    } catch (err) {
      console.error("[profile] avatar removal failed:", err?.code ?? err?.message ?? err);
      setAvatarMsg({
        kind: "error",
        text: friendlyError(err, copy.removeFailed, lang),
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const openConfirm = () => {
    setConfirmText("");
    setDeleteError("");
    setConfirming(true);
  };

  const cancelConfirm = () => {
    if (deleting) return;
    setConfirming(false);
    setConfirmText("");
    setDeleteError("");
  };

  const doDelete = async () => {
    if (!user || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      // Server-side wipe: reports, photos, audit rows, profile, then the
      // account itself (the client SDK cannot hard-delete users).
      await callFunction("submit-report", { action: "account", confirm: "DELETE" });
      // The account is gone, so the session is useless. Ending it here would
      // trip the route guard and hide this confirmation, so it waits for the
      // one action on the screen below.
      setDeleted(true);
    } catch (err) {
      console.error("[profile] delete failed:", err?.code ?? err?.message ?? err);
      setDeleteError(
        friendlyError(err, copy.deleteFailed, lang)
      );
      setDeleting(false);
    }
  };

  const leave = async () => {
    await logout();
    nav("/login", { replace: true });
  };

  if (deleted) {
    return (
      <div className="prf prf--done">
        <h1 className="prf-done-title">{copy.deletedTitle}</h1>
        <p className="prf-done-text">{copy.deletedText}</p>
        <p className="prf-done-note">{copy.deletedNote}</p>
        <button type="button" className="prf-btn prf-btn--primary" onClick={leave}>
          {copy.signOut}
        </button>
      </div>
    );
  }

  return (
    <div className="prf">
      <PageHeader title={copy.title} description={copy.desc} />

      <section className="prf-identity" aria-labelledby="prf-who">
        <div className="prf-avatar-wrap">
          <span className="prf-avatar">
            {avatar && !avatarBroken ? (
              <img
                className="prf-avatar-img"
                src={avatar}
                alt=""
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <span aria-hidden="true">{initial ?? <User className="h-6 w-6" />}</span>
            )}
          </span>
          <button
            type="button"
            className="prf-avatar-pick"
            onClick={pickAvatar}
            disabled={avatarBusy || deleting}
            aria-label={avatar && !avatarBroken ? copy.changePicture : copy.addPicture}
            title={avatar && !avatarBroken ? copy.changePicture : copy.addPicture}
          >
            <Camera size={14} aria-hidden="true" />
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept={AVATAR_TYPES.join(",")}
            className="sr-only"
            onChange={onAvatarChosen}
          />
        </div>
        <div className="prf-identity-body">
          <p id="prf-who" className="prf-name">
            {trimmedName || copy.noName}
          </p>
          <p className="prf-email">{user?.email ?? ""}</p>
          <div className="prf-avatar-actions">
            <button
              type="button"
              className="prf-linkbtn"
              onClick={pickAvatar}
              disabled={avatarBusy || deleting}
            >
              {avatarBusy
                ? copy.working
                : avatar && !avatarBroken
                  ? copy.changePhoto
                  : copy.addPhoto}
            </button>
            {avatar && !avatarBroken && (
              <button
                type="button"
                className="prf-linkbtn prf-linkbtn--muted"
                onClick={removeAvatar}
                disabled={avatarBusy || deleting}
              >
                <X size={13} aria-hidden="true" />
                {copy.remove}
              </button>
            )}
          </div>
          <p className="prf-hint">{copy.photoHint}</p>
          {avatarMsg && (
            <p
              className={avatarMsg.kind === "error" ? "prf-save prf-save--error" : "prf-save"}
              role={avatarMsg.kind === "error" ? "alert" : "status"}
            >
              {avatarMsg.text}
            </p>
          )}
        </div>
      </section>

      <section className="prf-section" aria-labelledby="prf-details">
        <h2 id="prf-details" className="prf-h2">
          {copy.details}
        </h2>

        {load === "loading" ? (
          <ProfileCardSkeleton />
        ) : load === "error" ? (
          <div className="prf-notice" role="alert">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            <p>{copy.loadError}</p>
            <button type="button" className="prf-btn prf-btn--ghost" onClick={reload}>
              {copy.reloadDetails}
            </button>
          </div>
        ) : (
          <form className="prf-form" onSubmit={save} noValidate>
            <div className="prf-grid">
              <label className="prf-field">
                <span className="prf-label">{copy.displayName}</span>
                <input
                  className="prf-input"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => editName(e.target.value)}
                  disabled={!canEdit}
                />
                <span className="prf-hint">{copy.nameHint}</span>
              </label>
            </div>

            <div className="prf-fact">
              <span className="prf-label">{copy.email}</span>
              <span className="prf-fact-value">{user?.email ?? "—"}</span>
              <span className="prf-hint">{copy.emailHint}</span>
            </div>

            <div className="prf-actions">
              <button
                type="submit"
                className="prf-btn prf-btn--primary"
                disabled={saving || !dirty || !canEdit}
              >
                {saving ? copy.saving : copy.saveDetails}
              </button>
              {saveMsg ? (
                <p
                  className={saveMsg.kind === "error" ? "prf-save prf-save--error" : "prf-save"}
                  role={saveMsg.kind === "error" ? "alert" : "status"}
                >
                  {saveMsg.text}
                </p>
              ) : !dirty ? (
                <p className="prf-save">{copy.noChanges}</p>
              ) : null}
            </div>
          </form>
        )}
      </section>

      <section className="prf-section" aria-labelledby="prf-account">
        <h2 id="prf-account" className="prf-h2">
          {copy.account}
        </h2>
        <ul className="prf-links">
          <li>
            <Link to="/my-reports" className="prf-link">
              <span className="prf-link-title">{copy.yourReports}</span>
              <span className="prf-link-desc">{copy.yourReportsDesc}</span>
            </Link>
          </li>
          <li>
            <Link to="/privacy" className="prf-link">
              <span className="prf-link-title">{copy.privacyPolicy}</span>
              <span className="prf-link-desc">{copy.privacyDesc}</span>
            </Link>
          </li>
        </ul>
      </section>

      <section className="prf-section" aria-labelledby="prf-danger">
        <h2 id="prf-danger" className="prf-h2">
          {copy.deleteAccount}
        </h2>
        <p className="prf-danger-text">{copy.deleteText}</p>

        {!confirming ? (
          <button
            ref={deleteTriggerRef}
            type="button"
            className="prf-btn prf-btn--quiet-danger"
            onClick={openConfirm}
          >
            {copy.deleteAccount}
          </button>
        ) : (
          <div className="prf-confirm">
            <label className="prf-field">
              <span className="prf-label">{copy.typeDelete}</span>
              <input
                ref={confirmInputRef}
                className="prf-input prf-input--code"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") cancelConfirm();
                }}
                aria-describedby="prf-confirm-hint"
                disabled={deleting}
              />
              <span id="prf-confirm-hint" className="prf-hint">
                {copy.deleteHint}
              </span>
            </label>

            <div className="prf-confirm-actions">
              <button
                type="button"
                className="prf-btn prf-btn--danger"
                onClick={doDelete}
                disabled={confirmText.trim().toUpperCase() !== "DELETE" || deleting}
              >
                {deleting ? copy.deleting : copy.deletePermanently}
              </button>
              <button
                type="button"
                className="prf-btn prf-btn--ghost"
                onClick={cancelConfirm}
                disabled={deleting}
              >
                {copy.keepAccount}
              </button>
            </div>

            {deleteError ? (
              <p className="prf-notice" role="alert">
                <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                <span>{deleteError}</span>
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
