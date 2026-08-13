import { useState, useCallback, useMemo, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { setAuthToken, setUnauthorizedHandler } from "../api/client.js";
import { AuthContext } from "./authContext.js";

const STORAGE_KEY = "camp-stock-id-token";

function decodeUser(idToken) {
  if (!idToken) {
    return null;
  }
  try {
    const payload = jwtDecode(idToken);
    return { name: payload.name, email: payload.email };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [idToken, setIdToken] = useState(() => localStorage.getItem(STORAGE_KEY));

  const login = useCallback((token) => {
    localStorage.setItem(STORAGE_KEY, token);
    setIdToken(token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIdToken(null);
  }, []);

  useEffect(() => {
    setAuthToken(idToken);
  }, [idToken]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo(
    () => ({ idToken, user: decodeUser(idToken), login, logout }),
    [idToken, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
