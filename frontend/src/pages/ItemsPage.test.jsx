import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ItemsPage from "./ItemsPage.jsx";
import { api } from "../api/client.js";

vi.mock("../api/client.js", () => ({
  api: {
    listItems: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

describe("ItemsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listItems.mockResolvedValue([
      { itemId: "1", name: "テント", category: "住", vehicleType: "car" },
      { itemId: "2", name: "タンクバッグ", category: "携帯品", vehicleType: "bike" },
      { itemId: "3", name: "さいふ", category: "携帯品", vehicleType: "both" },
    ]);
  });

  it("持ち物マスタ一覧を表示する", async () => {
    render(<ItemsPage />);
    expect(await screen.findByText("テント")).toBeInTheDocument();
    expect(screen.getByText("住")).toBeInTheDocument();
  });

  it("フォーム送信で持ち物マスタを作成する", async () => {
    const user = userEvent.setup();
    api.createItem.mockResolvedValue({ itemId: "4", name: "ランタン" });
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

    await user.click(screen.getAllByRole("button", { name: "削除" })[0]);

    await waitFor(() => {
      expect(api.deleteItem).toHaveBeenCalledWith("1");
    });
  });

  it("編集ボタンでフォームに切り替わり、保存でupdateItemを呼ぶ", async () => {
    const user = userEvent.setup();
    api.updateItem.mockResolvedValue({});
    render(<ItemsPage />);
    await screen.findByText("テント");

    const tentRow = screen.getByText("テント").closest("li");
    await user.click(within(tentRow).getByRole("button", { name: "編集" }));

    const nameInput = screen.getByDisplayValue("テント");
    await user.clear(nameInput);
    await user.type(nameInput, "ティピーテント");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(api.updateItem).toHaveBeenCalledWith("1", {
        name: "ティピーテント",
        category: "住",
        vehicleType: "car",
        storageLocation: undefined,
        notes: undefined,
      });
    });
  });

  it("区分の絞り込みでバイクのみを選ぶと車の持ち物は表示されない", async () => {
    const user = userEvent.setup();
    render(<ItemsPage />);
    await screen.findByText("テント");

    await user.selectOptions(screen.getByLabelText("区分で絞り込み"), "bike");

    expect(screen.queryByText("テント")).not.toBeInTheDocument();
    expect(screen.getByText("タンクバッグ")).toBeInTheDocument();
  });

  it("区分の絞り込みですべてを選ぶと全件表示される", async () => {
    const user = userEvent.setup();
    render(<ItemsPage />);
    await screen.findByText("テント");

    await user.selectOptions(screen.getByLabelText("区分で絞り込み"), "bike");
    await user.selectOptions(screen.getByLabelText("区分で絞り込み"), "all");

    expect(screen.getByText("テント")).toBeInTheDocument();
    expect(screen.getByText("タンクバッグ")).toBeInTheDocument();
    expect(screen.getByText("さいふ")).toBeInTheDocument();
  });
});
