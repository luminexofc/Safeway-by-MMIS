import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { account, isOperator } from "./appwrite";

const OperatorContext = createContext({
  user: null,
  checks: "loading", // loading | operator | rejected | signed-out
  refresh: async () => {},
  logout: async () => {},
});

export function OperatorProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checks, setChecks] = useState("loading");

  // Resolves to the resulting check so a caller can act on the outcome
  // (the login screen needs to tell "not an operator" from "no session kept").
  const refresh = useCallback(async () => {
    setChecks("loading");
    let me = null;
    try {
      me = await account.get();
    } catch {
      setUser(null);
      setChecks("signed-out");
      return "signed-out";
    }
    setUser(me);
    const next = (await isOperator(me.$id)) ? "operator" : "rejected";
    setChecks(next);
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      await account.deleteSession({ sessionId: "current" });
    } catch {
      // already signed out
    }
    setUser(null);
    setChecks("signed-out");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <OperatorContext.Provider value={{ user, checks, refresh, logout }}>
      {children}
    </OperatorContext.Provider>
  );
}

export const useOperator = () => useContext(OperatorContext);
