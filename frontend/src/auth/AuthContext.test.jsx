import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider } from "./AuthContext.jsx";
import { useAuth } from "./useAuth.js";
import { exchangeGoogleIdTokenForSession, setAuthToken } from "../api/client.js";

const STORAGE_KEY = "camp-stock-id-token";

vi.mock("../api/client.js", () => ({
  setAuthToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  exchangeGoogleIdTokenForSession: vi.fn(),
}));

// btoaはLatin1範囲外の文字を扱えないため、UTF-8バイト列に変換してからエンコードする。
function base64UrlEncode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// jwt-decodeは署名検証を行わずpayloadをbase64url decodeするだけのため、
// テストではダミーの署名を持つJWT形式の文字列で十分。バックエンドの
// 実セッショントークン（backend/src/lib/sessionToken.js）も同じ形式。
function fakeSessionToken(payload) {
  return `${base64UrlEncode({ alg: "none" })}.${base64UrlEncode(payload)}.signature`;
}

function clearSessionCookie() {
  document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0`;
}

function readSessionCookie() {
  const prefix = `${STORAGE_KEY}=`;
  const row = document.cookie.split("; ").find((entry) => entry.startsWith(prefix));
  return row ? decodeURIComponent(row.slice(prefix.length)) : null;
}

function Probe() {
  const { sessionToken, user, login, logout } = useAuth();
  return (
    <div>
      <p>ログイン状態: {sessionToken ? "ログイン中" : "未ログイン"}</p>
      <p>ユーザー: {user?.email || "なし"}</p>
      <button type="button" onClick={() => login("fake-google-id-token").catch(() => {})}>
        ログイン
      </button>
      <button type="button" onClick={() => logout()}>
        ログアウト
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe("AuthContext / AuthProvider", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearSessionCookie();
  });

  it("login: Google IDトークンをセッショントークンへ交換し、Cookieへ保存する", async () => {
    const sessionToken = fakeSessionToken({ sub: "user-1", email: "user@example.com" });
    exchangeGoogleIdTokenForSession.mockResolvedValue({
      sessionToken,
      user: { userId: "user-1", email: "user@example.com" },
    });
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(exchangeGoogleIdTokenForSession).toHaveBeenCalledWith("fake-google-id-token");
    await waitFor(() => {
      expect(screen.getByText("ログイン状態: ログイン中")).toBeInTheDocument();
    });
    expect(screen.getByText("ユーザー: user@example.com")).toBeInTheDocument();
    expect(setAuthToken).toHaveBeenCalledWith(sessionToken);
    expect(readSessionCookie()).toBe(sessionToken);
  });

  it("login: セッション交換に失敗した場合、ログイン状態を変更せず例外を投げる", async () => {
    exchangeGoogleIdTokenForSession.mockRejectedValue(new Error("認証情報が無効です"));
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(screen.getByText("ログイン状態: 未ログイン")).toBeInTheDocument();
    });
    expect(readSessionCookie()).toBeNull();
  });

  it("logout: Cookieとログイン状態をクリアする", async () => {
    const sessionToken = fakeSessionToken({ sub: "user-1", email: "user@example.com" });
    exchangeGoogleIdTokenForSession.mockResolvedValue({
      sessionToken,
      user: { userId: "user-1", email: "user@example.com" },
    });
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "ログイン" }));
    await waitFor(() => {
      expect(screen.getByText("ログイン状態: ログイン中")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(screen.getByText("ログイン状態: 未ログイン")).toBeInTheDocument();
    expect(readSessionCookie()).toBeNull();
  });
});
