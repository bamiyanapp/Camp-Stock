import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ShareButton from "./ShareButton.jsx";

function mockClipboard(writeText) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
}

describe("ShareButton", () => {
  beforeEach(() => {
    mockClipboard(vi.fn().mockResolvedValue(undefined));
  });

  it("既定のラベルでトリガーボタンを表示する", () => {
    render(<ShareButton />);
    expect(screen.getByRole("button", { name: "このページを共有" })).toBeInTheDocument();
  });

  it("カスタムラベル・classNameを反映する", () => {
    render(<ShareButton label="招待リンクを共有" className="btn-primary" />);
    const button = screen.getByRole("button", { name: "招待リンクを共有" });
    expect(button).toHaveClass("btn-primary");
  });

  it("既定のgetUrlはwindow.location.hrefを使う", () => {
    render(<ShareButton />);
    fireEvent.click(screen.getByRole("button", { name: "このページを共有" }));
    expect(screen.getByText(window.location.href)).toBeInTheDocument();
  });

  it("カスタムgetUrlで指定したURLを表示する", () => {
    render(<ShareButton getUrl={() => "https://example.com/invite/abc"} />);
    fireEvent.click(screen.getByRole("button", { name: "このページを共有" }));
    expect(screen.getByText("https://example.com/invite/abc")).toBeInTheDocument();
  });

  it("URLをコピーをタップするとclipboardへ書き込み、文言が変わる", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);
    render(<ShareButton getUrl={() => "https://example.com/invite/abc"} />);
    fireEvent.click(screen.getByRole("button", { name: "このページを共有" }));

    await fireEvent.click(screen.getByRole("button", { name: "URLをコピー" }));

    expect(writeText).toHaveBeenCalledWith("https://example.com/invite/abc");
    expect(await screen.findByRole("button", { name: "コピーしました" })).toBeInTheDocument();
  });

  it("clipboard書き込みが失敗しても例外を投げずに文言は変わらない", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<ShareButton />);
    fireEvent.click(screen.getByRole("button", { name: "このページを共有" }));

    await fireEvent.click(screen.getByRole("button", { name: "URLをコピー" }));

    expect(screen.getByRole("button", { name: "URLをコピー" })).toBeInTheDocument();
  });

  it("閉じるをタップするとモーダルが閉じる", () => {
    render(<ShareButton />);
    fireEvent.click(screen.getByRole("button", { name: "このページを共有" }));
    expect(screen.getByText(window.location.href)).toBeInTheDocument();

    const [closeButton] = screen.getAllByRole("button", { name: "閉じる" });
    fireEvent.click(closeButton);

    expect(screen.queryByText(window.location.href)).not.toBeInTheDocument();
  });

  it("再度開くとコピー済み表示がリセットされる", async () => {
    render(<ShareButton getUrl={() => "https://example.com/invite/abc"} />);
    fireEvent.click(screen.getByRole("button", { name: "このページを共有" }));
    await fireEvent.click(screen.getByRole("button", { name: "URLをコピー" }));
    expect(await screen.findByRole("button", { name: "コピーしました" })).toBeInTheDocument();
    const [closeButton] = screen.getAllByRole("button", { name: "閉じる" });
    fireEvent.click(closeButton);

    fireEvent.click(screen.getByRole("button", { name: "このページを共有" }));

    expect(screen.getByRole("button", { name: "URLをコピー" })).toBeInTheDocument();
  });
});
