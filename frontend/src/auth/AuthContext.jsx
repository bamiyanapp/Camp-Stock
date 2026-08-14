import { useState, useCallback, useMemo, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { setAuthToken, setUnauthorizedHandler } from "../api/client.js";
import { AuthContext } from "./authContext.js";

const STORAGE_KEY = "camp-stock-id-token";
// 30日: ブラウザを閉じて再訪問してもログイン状態を維持するための保持期間。
// IDトークン自体の有効期限（通常1時間程度）が切れている場合は、これまで通り
// APIの401応答（onUnauthorized）で自動ログアウトされる。
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function readSessionCookie() {
  const prefix = `${STORAGE_KEY}=`;
  const row = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return row ? decodeURIComponent(row.slice(prefix.length)) : null;
}

function writeSessionCookie(value, maxAgeSeconds) {
  // Cookieはlocation.protocolがhttpsの場合のみSecure属性を付与する。
  // ローカル開発（http://localhost）ではSecure属性を付けるとブラウザが
  // Cookie自体を保存しないため、http/https両方で永続化できるようにする。
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function decodeUser(idToken) {
  if (!idToken) {
    return null;
  }
  try {
    const payload = jwtDecode(idToken);
    return { name: payload.name, email: payload.email, picture: payload.picture };
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
    const stored = readSessionCookie();
    setAuthToken(stored);
    return stored;
  });
  // 401による自動ログアウトの理由。ログイン画面に戻った後も表示し続けられる
  // よう、logout()呼び出し後も保持する（次のlogin()成功時にクリアする）。
  const [authError, setAuthError] = useState(null);

  const login = useCallback((token) => {
    writeSessionCookie(token, COOKIE_MAX_AGE_SECONDS);
    setAuthToken(token);
    setAuthError(null);
    setIdToken(token);
  }, []);

  const logout = useCallback((reason) => {
    writeSessionCookie("", 0);
    setAuthToken(null);
    if (reason) {
      setAuthError(reason);
    }
    setIdToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo(
    () => ({ idToken, user: decodeUser(idToken), authError, login, logout }),
    [idToken, authError, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
