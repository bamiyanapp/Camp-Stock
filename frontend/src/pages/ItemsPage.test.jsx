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
    const tentRow = screen.getByText("テント").closest("li");
    expect(within(tentRow).getByText("住")).toBeInTheDocument();
  });

  it("フォーム送信で持ち物マスタを作成する（新しい区分を追加）", async () => {
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
        emoji: "",
        category: "キャンプ",
        vehicleType: "both",
      });
    });
  });

  it("絵文字を入力して持ち物マスタを作成する", async () => {
    const user = userEvent.setup();
    api.createItem.mockResolvedValue({ itemId: "4", name: "ランタン" });
    render(<ItemsPage />);
    await screen.findByText("テント");

    await user.type(screen.getByPlaceholderText("品名"), "ランタン");
    await user.type(screen.getByLabelText("絵文字"), "🏮");
    await user.type(
      screen.getByPlaceholderText("ジャンル（例: 調理、住、衣類）"),
      "キャンプ"
    );
    await user.click(screen.getByRole("button", { name: "持ち物を追加" }));

    await waitFor(() => {
      expect(api.createItem).toHaveBeenCalledWith({
        name: "ランタン",
        emoji: "🏮",
        category: "キャンプ",
        vehicleType: "both",
      });
    });
  });

  it("絵文字が設定された持ち物は、一覧で品名とともに表示される", async () => {
    api.listItems.mockResolvedValue([
      { itemId: "1", name: "テント", emoji: "⛺", category: "住", vehicleType: "car" },
    ]);
    render(<ItemsPage />);
    await screen.findByText("テント");
    expect(screen.getByText("⛺")).toBeInTheDocument();
  });

  it("絵文字が未設定の持ち物は、品名のみ表示される（表示崩れなし）", async () => {
    render(<ItemsPage />);
    const tentRow = await screen.findByText("テント");
    expect(tentRow.closest("li")).toBeInTheDocument();
  });

  it("既存の区分をセレクトで選ぶと、新規区分入力欄は表示されずその区分で作成される", async () => {
    const user = userEvent.setup();
    api.createItem.mockResolvedValue({ itemId: "4", name: "ランタン" });
    render(<ItemsPage />);
    await screen.findByText("テント");

    const createForm = screen.getByPlaceholderText("品名").closest("form");
    const [categorySelect] = within(createForm).getAllByRole("combobox");
    await user.selectOptions(categorySelect, "住");

    expect(
      within(createForm).queryByPlaceholderText("ジャンル（例: 調理、住、衣類）")
    ).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("品名"), "ランタン");
    await user.click(screen.getByRole("button", { name: "持ち物を追加" }));

    await waitFor(() => {
      expect(api.createItem).toHaveBeenCalledWith({
        name: "ランタン",
        emoji: "",
        category: "住",
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
        emoji: "",
        category: "住",
        vehicleType: "car",
        storageLocation: undefined,
        notes: undefined,
      });
    });
  });

  it("編集フォームで既存の区分に変更でき、その区分でupdateItemを呼ぶ", async () => {
    const user = userEvent.setup();
    api.updateItem.mockResolvedValue({});
    render(<ItemsPage />);
    await screen.findByText("テント");

    const tentRow = screen.getByText("テント").closest("li");
    await user.click(within(tentRow).getByRole("button", { name: "編集" }));

    const editForm = screen.getByDisplayValue("テント").closest("form");
    const [categorySelect] = within(editForm).getAllByRole("combobox");
    expect(categorySelect).toHaveValue("住");
    await user.selectOptions(categorySelect, "携帯品");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(api.updateItem).toHaveBeenCalledWith("1", {
        name: "テント",
        emoji: "",
        category: "携帯品",
        vehicleType: "car",
        storageLocation: undefined,
        notes: undefined,
      });
    });
  });

  it("編集フォームを開くと既存の絵文字が入力欄に反映され、変更を保存できる", async () => {
    const user = userEvent.setup();
    api.listItems.mockResolvedValue([
      { itemId: "1", name: "テント", emoji: "⛺", category: "住", vehicleType: "car" },
    ]);
    api.updateItem.mockResolvedValue({});
    render(<ItemsPage />);
    await screen.findByText("テント");

    const tentRow = screen.getByText("テント").closest("li");
    await user.click(within(tentRow).getByRole("button", { name: "編集" }));

    const editForm = screen.getByDisplayValue("テント").closest("form");
    const emojiInput = within(editForm).getByLabelText("絵文字");
    expect(emojiInput).toHaveValue("⛺");
    await user.clear(emojiInput);
    await user.type(emojiInput, "🏕️");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(api.updateItem).toHaveBeenCalledWith("1", {
        name: "テント",
        emoji: "🏕️",
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
