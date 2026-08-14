import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
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
    localStorage.setItem(STORAGE_KEY, fakeIdToken({ name: "Test User", email: "test@example.com" }));
    render(<App />);
    expect(screen.getByRole("link", { name: "キャンプ一覧" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "持ち物マスタ" })).toBeInTheDocument();
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
