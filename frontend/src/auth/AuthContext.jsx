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
  // authTokenの同期をuseEffectに任せると、Reactのeffect実行順序（子が先、
  // 親が後）により、ログイン直後に初めてマウントされる子コンポーネントの
  // データ取得（例: CampListPageのuseEffect(reload, [])）が、
  // このコンポーネントのuseEffectより先に実行されてしまう。その結果、
  // Authorizationヘッダーがまだ設定されていない状態で最初のAPIリクエストが
  // 送信され、401→自動ログアウトが起きる。これを避けるため、
  // 初期状態の算出（レンダーフェーズ、子のマウントより前）とlogin/logout
  // （呼び出し元の同期処理内）でsetAuthTokenを直接呼び、子コンポーネントの
  // effectが実行される前に確実にauthTokenを確定させる。
  const [idToken, setIdToken] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setAuthToken(stored);
    return stored;
  });

  const login = useCallback((token) => {
    localStorage.setItem(STORAGE_KEY, token);
    setAuthToken(token);
    setIdToken(token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthToken(null);
    setIdToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo(
    () => ({ idToken, user: decodeUser(idToken), login, logout }),
    [idToken, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
