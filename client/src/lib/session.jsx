import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { account } from "./appwrite";

const SessionContext = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
  setUser: () => {},
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
  const [loading, setLoading] = useState(true);

  // Best-effort user fetch. Deliberately never clobbers state with null on
  // failure: the login flow sets the user directly from the session first,
  // and this only fills in display details (name, email).
  const refresh = useCallback(async () => {
    try {
      const me = await account.get();
      setUser(me);
      return me;
    } catch (err) {
      // 401 just means "signed out" — expected on public pages.
      if (err?.code !== 401) console.warn("[session] could not fetch user:", err?.code ?? err?.message ?? err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // already signed out — either way the local state ends clean
    }
    setUser(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ user, loading, refresh, setUser, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
