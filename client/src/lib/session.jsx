import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { account } from "./appwrite";

const SessionContext = createContext({
  user: null,
  loading: true,
  refresh: async () => {},
  setUser: () => {},
  logout: async () => {},
});

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
      console.error("[session] could not fetch user:", err?.code ?? err?.message ?? err);
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
