import { useState, useCallback, useMemo, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { setAuthToken, setUnauthorizedHandler, exchangeGoogleIdTokenForSession } from "../api/client.js";
import { AuthContext } from "./authContext.js";

// Cookie名自体は、Google IDトークンを直接保持していた頃からの互換のため変更
// していない（実際に保持する値は、下記の通りバックエンド自社発行のセッション
// トークンに変わっている）。
const STORAGE_KEY = "camp-stock-id-token";
// 30日: ブラウザを閉じて再訪問してもログイン状態を維持するための保持期間。
// バックエンドが発行するセッショントークン自体の有効期限もこれに合わせて
// いる（backend/src/handler.jsのSESSION_MAX_AGE_SECONDS）。トークンが失効
// している場合は、これまで通りAPIの401応答（onUnauthorized）で自動ログアウト
// される。
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

function decodeUser(sessionToken) {
  if (!sessionToken) {
    return null;
  }
  try {
    const payload = jwtDecode(sessionToken);
    // subはGoogleアカウントの一意なユーザーID（バックエンドのownerUserId等と
    // 同じ値）。セッショントークンの発行時にsubject（=jwtDecode後のsub）へ
    // Google IDトークンのsubをそのまま引き継いでいる（backend/src/lib/
    // sessionToken.js）。キャンプの所有者判定（招待リンクの表示可否等）に使う。
    return {
      sub: payload.sub,
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };
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
  // （呼び出し元の処理内）でsetAuthTokenを直接呼び、子コンポーネントの
  // effectが実行される前に確実にauthTokenを確定させる。
  const [sessionToken, setSessionToken] = useState(() => {
    const stored = readSessionCookie();
    setAuthToken(stored);
    return stored;
  });
  // 401による自動ログアウトの理由。ログイン画面に戻った後も表示し続けられる
  // よう、logout()呼び出し後も保持する（次のlogin()成功時にクリアする）。
  const [authError, setAuthError] = useState(null);

  // Googleが発行するIDトークン（有効期限は約1時間、延長不可）を直接保持する
  // のではなく、バックエンドの POST /auth/session で自社発行のセッション
  // トークン（30日）へ交換してから保存する（Issue #201: 再ログイン回避）。
  const login = useCallback(async (googleIdToken) => {
    const { sessionToken: issuedToken } = await exchangeGoogleIdTokenForSession(googleIdToken);
    writeSessionCookie(issuedToken, COOKIE_MAX_AGE_SECONDS);
    setAuthToken(issuedToken);
    setAuthError(null);
    setSessionToken(issuedToken);
  }, []);

  const logout = useCallback((reason) => {
    writeSessionCookie("", 0);
    setAuthToken(null);
    if (reason) {
      setAuthError(reason);
    }
    setSessionToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  const value = useMemo(
    () => ({ sessionToken, user: decodeUser(sessionToken), authError, login, logout }),
    [sessionToken, authError, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
