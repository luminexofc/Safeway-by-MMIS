import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { account } from "./appwrite";

const SessionContext = createContext({
  user: null,
  loading: true,
  oauthBlocked: false,
  refresh: async () => {},
  setUser: () => {},
  logout: async () => {},
});

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [oauthBlocked, setOauthBlocked] = useState(false);

  // Best-effort user fetch. Deliberately never clobbers state with null on
  // failure: the login flow sets the user directly from the session first,
  // and this only fills in display details (name, email).
  const refresh = useCallback(async () => {
    try {
      const me = await account.get();
      sessionStorage.removeItem("sp_oauth_pending");
      setOauthBlocked(false);
      setUser(me);
      return me;
    } catch (err) {
      console.error("[session] could not fetch user:", err?.code ?? err?.message ?? err);
      // 401 right after an OAuth redirect means the browser dropped the
      // cross-site session cookie — tell the login page in plain words.
      if (err?.code === 401 && sessionStorage.getItem("sp_oauth_pending")) {
        setOauthBlocked(true);
      }
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
    <SessionContext.Provider value={{ user, loading, oauthBlocked, refresh, setUser, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
