import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App.jsx";

describe("App", () => {
  beforeEach(() => {
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
    render(<App />);
    expect(screen.getByRole("link", { name: "キャンプ一覧" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "持ち物マスタ" })).toBeInTheDocument();
  });

  it("現在のアプリバージョンを表示する", () => {
    render(<App />);
    expect(screen.getByText(/^v\d+\.\d+\.\d+$/)).toBeInTheDocument();
  });
});
