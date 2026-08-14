import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CampItemSelectionPage from "./CampItemSelectionPage.jsx";
import { api } from "../api/client.js";

vi.mock("../api/client.js", () => ({
  api: {
    getCamp: vi.fn(),
    listCampItems: vi.fn(),
    setCampItemUsed: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/camps/camp-1/select-items"]}>
      <Routes>
        <Route path="/camps/:campId/select-items" element={<CampItemSelectionPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("CampItemSelectionPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getCamp.mockResolvedValue({
      campId: "camp-1",
      name: "夏キャンプ",
      vehicleType: "car",
    });
    api.listCampItems.mockResolvedValue([
      {
        itemId: "item-1",
        name: "テント",
        category: "住",
        vehicleType: "car",
        used: true,
        packed: false,
      },
      {
        itemId: "item-2",
        name: "さいふ",
        category: "携帯品",
        vehicleType: "both",
        used: false,
        packed: false,
      },
    ]);
  });

  it("使用中・未使用問わず、対応する持ち物すべてをカテゴリ別に表示する", async () => {
    renderPage();
    expect(await screen.findByText("テント")).toBeInTheDocument();
    expect(screen.getByText("住")).toBeInTheDocument();
    expect(screen.getByText("さいふ")).toBeInTheDocument();
    expect(screen.getByText("携帯品")).toBeInTheDocument();
  });

  it("used状態をチェックボックスの初期状態に反映する", async () => {
    renderPage();
    await screen.findByText("テント");
    expect(screen.getByLabelText("テントを今回使う")).toBeChecked();
    expect(screen.getByLabelText("さいふを今回使う")).not.toBeChecked();
  });

  it("チェックボックスの切り替えでsetCampItemUsedを呼ぶ", async () => {
    const user = userEvent.setup();
    api.setCampItemUsed.mockResolvedValue({});
    renderPage();
    await screen.findByText("さいふ");

    await user.click(screen.getByLabelText("さいふを今回使う"));

    await waitFor(() => {
      expect(api.setCampItemUsed).toHaveBeenCalledWith("camp-1", "item-2", true);
    });
  });

  it("チェックボックスの切り替えでは一覧を再取得せず、対象アイテムのみを楽観的に更新する", async () => {
    const user = userEvent.setup();
    api.setCampItemUsed.mockResolvedValue({});
    renderPage();
    await screen.findByText("さいふ");
    expect(api.listCampItems).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText("さいふを今回使う"));

    await waitFor(() => {
      expect(api.setCampItemUsed).toHaveBeenCalledWith("camp-1", "item-2", true);
    });
    expect(screen.getByLabelText("さいふを今回使う")).toBeChecked();
    // reload()を伴わないため、一覧の再取得は初回マウント時の1回のみ
    expect(api.listCampItems).toHaveBeenCalledTimes(1);
  });

  it("APIリクエストが失敗した場合、対象のチェックボックスのみ元の状態に戻す", async () => {
    const user = userEvent.setup();
    api.setCampItemUsed.mockRejectedValue(new Error("更新に失敗しました"));
    renderPage();
    await screen.findByText("さいふ");

    await user.click(screen.getByLabelText("さいふを今回使う"));

    await waitFor(() => {
      expect(screen.getByText("更新に失敗しました")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("さいふを今回使う")).not.toBeChecked();
  });

  it("絵文字が設定された持ち物は、品名とともに絵文字を表示する", async () => {
    api.listCampItems.mockResolvedValue([
      {
        itemId: "item-1",
        name: "テント",
        emoji: "⛺",
        category: "住",
        vehicleType: "car",
        used: true,
        packed: false,
      },
    ]);
    renderPage();
    await screen.findByText("テント");
    expect(screen.getByText("⛺")).toBeInTheDocument();
  });

  it("キャンプ詳細画面へ戻るリンクを表示する", async () => {
    renderPage();
    await screen.findByText("テント");
    expect(screen.getByRole("link", { name: "← 夏キャンプへ戻る" })).toHaveAttribute(
      "href",
      "/camps/camp-1"
    );
  });
});
