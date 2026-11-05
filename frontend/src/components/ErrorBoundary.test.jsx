import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary.jsx";

// レンダリング中に例外を投げるテスト用コンポーネント
function Bomb() {
  throw new Error("boom");
}

// componentDidCatchがconsole.errorへ出力する内容はテストの本質ではないため、
// 各テストでモックして標準出力を汚さない
function mockConsoleError() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("ErrorBoundary", () => {
  let reload;

  beforeEach(() => {
    reload = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload, href: window.location.href },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("例外が無ければchildrenをそのまま表示する", () => {
    const consoleErrorSpy = mockConsoleError();
    render(
      <ErrorBoundary>
        <p>正常な画面</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("正常な画面")).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("子要素で例外が発生すると、真っ白画面の代わりにフォールバック画面を表示する", () => {
    const consoleErrorSpy = mockConsoleError();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("再読み込みボタンをタップするとwindow.location.reload()が呼ばれる", () => {
    const consoleErrorSpy = mockConsoleError();
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));
    expect(reload).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("reportUrlを指定すると、捕捉した例外情報をPOSTする", async () => {
    const consoleErrorSpy = mockConsoleError();
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    render(
      <ErrorBoundary reportUrl="https://api.example.com/report-client-error">
        <Bomb />
      </ErrorBoundary>
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/report-client-error",
      expect.objectContaining({ method: "POST" })
    );
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.message).toBe("boom");
    consoleErrorSpy.mockRestore();
  });

  it("reportUrlへの送信が失敗しても、フォールバック画面の表示を妨げない", async () => {
    const consoleErrorSpy = mockConsoleError();
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    render(
      <ErrorBoundary reportUrl="https://api.example.com/report-client-error">
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("fallbackUrlを指定すると、例外検知時に自動的にそのURLへ遷移する", () => {
    const consoleErrorSpy = mockConsoleError();
    render(
      <ErrorBoundary fallbackUrl="/stable">
        <Bomb />
      </ErrorBoundary>
    );
    expect(window.location.href).toBe("/stable");
    consoleErrorSpy.mockRestore();
  });

  it("fallbackUrlを指定した状態で再読み込みボタンをタップすると、そのURLへ遷移する（reloadは呼ばない）", () => {
    const consoleErrorSpy = mockConsoleError();
    render(
      <ErrorBoundary fallbackUrl="/stable">
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: "再読み込み" }));
    expect(window.location.href).toBe("/stable");
    expect(reload).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});
