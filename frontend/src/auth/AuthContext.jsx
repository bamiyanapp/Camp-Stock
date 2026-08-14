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
  // 401による自動ログアウトの理由。ログイン画面に戻った後も表示し続けられる
  // よう、logout()呼び出し後も保持する（次のlogin()成功時にクリアする）。
  const [authError, setAuthError] = useState(null);

  const login = useCallback((token) => {
    localStorage.setItem(STORAGE_KEY, token);
    setAuthError(null);
    setIdToken(token);
  }, []);

  const logout = useCallback((reason) => {
    localStorage.removeItem(STORAGE_KEY);
    if (reason) {
      setAuthError(reason);
    }
    setIdToken(null);
  }, []);

  useEffect(() => {
    setAuthToken(idToken);
  }, [idToken]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo(
    () => ({ idToken, user: decodeUser(idToken), authError, login, logout }),
    [idToken, authError, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
