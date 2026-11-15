import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { account, fetchAvatarBlobUrl, getAvatarFileId } from "./appwrite";

const SessionContext = createContext({
  user: null,
  avatar: null, // blob: URL for the owner's profile picture, or null
  loading: true,
  refresh: async () => {},
  setUser: () => {},
  setAvatarFileId: () => {},
  logout: async () => {},
});

// Google sign-in via the OAuth2 token flow. Unlike createOAuth2Session, this
// does not rely on a third-party cookie surviving the round trip: Appwrite
// returns one-time userId/secret params that /auth/callback exchanges for a
// session stored in localStorage.cookieFallback.
export function startGoogleAuth() {
  const origin = window.location.origin;
  account.createOAuth2Token({
    provider: "google",
    success: `${origin}/auth/callback`,
    failure: `${origin}/auth-error`,
  });
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  // Held here so the navbar and the profile page agree without extra fetches.
  const [avatarFileId, setAvatarFileIdState] = useState(null);
  // Cached blob URL, tagged with the id it belongs to so a stale URL is never
  // shown for a picture that has since been replaced or removed.
  const [avatarCache, setAvatarCache] = useState({ fileId: null, url: null });
  const [loading, setLoading] = useState(true);

  // Best-effort user fetch. Deliberately never clobbers state with null on
  // failure: the login flow sets the user directly from the session first,
  // and this only fills in display details (name, email).
  const refresh = useCallback(async () => {
    try {
      const me = await account.get();
      setUser(me);
      setAvatarFileIdState(await getAvatarFileId());
      return me;
    } catch (err) {
      // 401 just means "signed out" — expected on public pages.
      if (err?.code !== 401) console.warn("[session] could not fetch user:", err?.code ?? err?.message ?? err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setAvatarFileId = useCallback((fileId) => {
    setAvatarFileIdState(fileId ?? null);
  }, []);

  // Fetch the picture once per file id into an object URL. Only the promise
  // callbacks touch state, so this never triggers a cascading render.
  useEffect(() => {
    if (!avatarFileId) return undefined;
    let live = true;
    let objectUrl = null;

    fetchAvatarBlobUrl(avatarFileId)
      .then((next) => {
        if (!live) {
          if (next) URL.revokeObjectURL(next);
          return;
        }
        objectUrl = next;
        setAvatarCache({ fileId: avatarFileId, url: next });
      })
      .catch(() => {
        // A missing picture is not an error state; initials stand in.
        if (live) setAvatarCache({ fileId: avatarFileId, url: null });
      });

    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFileId]);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // already signed out — either way the local state ends clean
    }
    setUser(null);
    setAvatarFileIdState(null);
    setAvatarCache({ fileId: null, url: null });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derived, never stored: a URL for a different (or removed) picture is
  // never rendered.
  const avatar =
    avatarFileId && avatarCache.fileId === avatarFileId ? avatarCache.url : null;

  return (
    <SessionContext.Provider
      value={{ user, avatar, loading, refresh, setUser, setAvatarFileId, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
