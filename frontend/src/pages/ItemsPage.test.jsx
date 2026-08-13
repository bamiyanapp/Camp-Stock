import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemsPage from "./ItemsPage.jsx";
import { api } from "../api/client.js";

vi.mock("../api/client.js", () => ({
  api: {
    listItems: vi.fn(),
    createItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

describe("ItemsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listItems.mockResolvedValue([
      { itemId: "1", name: "テント", category: "住", vehicleType: "car" },
    ]);
  });

  it("持ち物マスタ一覧を表示する", async () => {
    render(<ItemsPage />);
    expect(await screen.findByText("テント")).toBeInTheDocument();
    expect(screen.getByText("住")).toBeInTheDocument();
  });

  it("フォーム送信で持ち物マスタを作成する", async () => {
    const user = userEvent.setup();
    api.createItem.mockResolvedValue({ itemId: "2", name: "ランタン" });
    render(<ItemsPage />);
    await screen.findByText("テント");

    await user.type(screen.getByPlaceholderText("品名"), "ランタン");
    await user.type(
      screen.getByPlaceholderText("ジャンル（例: 調理、住、衣類）"),
      "キャンプ"
    );
    await user.click(screen.getByRole("button", { name: "持ち物を追加" }));

    await waitFor(() => {
      expect(api.createItem).toHaveBeenCalledWith({
        name: "ランタン",
        category: "キャンプ",
        vehicleType: "both",
      });
    });
  });

  it("削除ボタンで持ち物マスタを削除する", async () => {
    const user = userEvent.setup();
    api.deleteItem.mockResolvedValue(null);
    render(<ItemsPage />);
    await screen.findByText("テント");

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith("1");
    });
  });
});
