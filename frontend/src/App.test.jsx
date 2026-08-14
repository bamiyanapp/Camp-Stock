import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import App from "./App.jsx";

const STORAGE_KEY = "camp-stock-id-token";

function base64UrlEncode(obj) {
  return btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// jwt-decodeは署名検証を行わずpayloadをbase64url decodeするだけのため、
// テストではダミーの署名を持つJWT形式の文字列で十分。
function fakeIdToken(payload) {
  return `${base64UrlEncode({ alg: "none" })}.${base64UrlEncode(payload)}.signature`;
}

// AuthContextはセッションをCookieに保存するため、localStorageではなく
// document.cookieにログイン状態を積んでからレンダリングする。
function setSessionCookie(token) {
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(token)}; Path=/`;
}

function clearSessionCookie() {
  document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0`;
}

describe("App", () => {
  beforeEach(() => {
    clearSessionCookie();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
  });

  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("キャンプ一覧・持ち物マスタへのナビゲーションを表示する", () => {
    setSessionCookie(fakeIdToken({ name: "Test User", email: "test@example.com" }));
    render(<App />);
    expect(screen.getByRole("link", { name: "キャンプ一覧" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "持ち物マスタ" })).toBeInTheDocument();
  });

  it("pictureがある場合、アカウント画像を表示する", () => {
    setSessionCookie(
      fakeIdToken({
        name: "Test User",
        email: "test@example.com",
        picture: "https://example.com/avatar.png",
      })
    );
    render(<App />);
    const avatar = screen.getByRole("img", { name: "Test User" });
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("画像の読み込みに失敗した場合、テキスト表記にフォールバックする", () => {
    setSessionCookie(
      fakeIdToken({
        name: "Test User",
        email: "test@example.com",
        picture: "https://example.com/broken.png",
      })
    );
    render(<App />);
    const avatar = screen.getByRole("img", { name: "Test User" });
    fireEvent.error(avatar);
    expect(screen.getByText("Test User としてログイン中")).toBeInTheDocument();
  });

  it("pictureが無い場合、テキスト表記にフォールバックする", () => {
    setSessionCookie(fakeIdToken({ name: "Test User", email: "test@example.com" }));
    render(<App />);
    expect(screen.getByText("Test User としてログイン中")).toBeInTheDocument();
  });

  it("ログイン済み状態でのマウント時、最初のAPIリクエストからAuthorizationヘッダーを送る", async () => {
    const token = fakeIdToken({ name: "Test User", email: "test@example.com" });
    setSessionCookie(token);
    render(<App />);

    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, firstRequestOptions] = global.fetch.mock.calls[0];
    expect(firstRequestOptions.headers["Authorization"]).toBe(`Bearer ${token}`);
  });

  it("ログアウトボタンでセッションCookieが削除される", () => {
    setSessionCookie(fakeIdToken({ name: "Test User", email: "test@example.com" }));
    render(<App />);
    expect(screen.getByRole("button", { name: "ログアウト" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ログアウト" }));

    expect(document.cookie.includes(`${STORAGE_KEY}=`)).toBe(false);
    expect(screen.getByText("Camp Stockを利用するにはGoogleアカウントでログインしてください")).toBeInTheDocument();
  });

  it("現在のアプリバージョンを表示する", () => {
    render(<App />);
    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
  });

  it("ビルド日時を表示する", () => {
    render(<App />);
    expect(screen.getByText(/^更新日時: /)).toBeInTheDocument();
  });
});
