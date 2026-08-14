import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CampDetailPage from "./CampDetailPage.jsx";
import { api } from "../api/client.js";

vi.mock("../api/client.js", () => ({
  api: {
    getCamp: vi.fn(),
    listCampItems: vi.fn(),
    setCampItemPacked: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/camps/camp-1"]}>
      <Routes>
        <Route path="/camps/:campId" element={<CampDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("CampDetailPage", () => {
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
        used: false,
        packed: false,
      },
      {
        itemId: "item-2",
        name: "さいふ",
        category: "携帯品",
        vehicleType: "both",
        used: true,
        packed: false,
      },
    ]);
  });

  it("キャンプ名と「今回使う」持ち物のみをカテゴリ別に表示する", async () => {
    renderPage();
    expect(await screen.findByText("夏キャンプ（車）")).toBeInTheDocument();
    expect(screen.getByText("携帯品")).toBeInTheDocument();
    expect(screen.getByText("さいふ")).toBeInTheDocument();
    // used=falseの「テント」は一覧に表示されない
    expect(screen.queryByText("テント")).not.toBeInTheDocument();
    expect(screen.queryByText("住")).not.toBeInTheDocument();
  });

  it("「持ち物を選ぶ」リンクで選択画面へ遷移できる", async () => {
    renderPage();
    await screen.findByText("夏キャンプ（車）");
    expect(screen.getByRole("link", { name: "持ち物を選ぶ" })).toHaveAttribute(
      "href",
      "/camps/camp-1/select-items"
    );
  });

  it("「今回使う」持ち物が1件も無い場合、案内文を表示する", async () => {
    api.listCampItems.mockResolvedValue([]);
    renderPage();
    await screen.findByText("夏キャンプ（車）");
    expect(
      screen.getByText("今回使う持ち物がまだ選択されていません。「持ち物を選ぶ」から選択してください。")
    ).toBeInTheDocument();
  });

  it("各行には「今回使う」チェックボックスを表示せず、「積んだ」チェックボックスのみ表示する", async () => {
    renderPage();
    await screen.findByText("さいふ");
    const walletRow = screen.getByText("さいふ").closest("li");
    expect(walletRow.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
    expect(screen.queryByLabelText("さいふを今回使う")).not.toBeInTheDocument();
  });

  it("「積んだ」チェックボックスでsetCampItemPackedを呼ぶ", async () => {
    const user = userEvent.setup();
    api.setCampItemPacked.mockResolvedValue({});
    renderPage();
    await screen.findByText("さいふ");

    const walletRow = screen.getByText("さいふ").closest("li");
    const checkbox = walletRow.querySelector('input[type="checkbox"]');
    await user.click(checkbox);

    await waitFor(() => {
      expect(api.setCampItemPacked).toHaveBeenCalledWith("camp-1", "item-2", true);
    });
  });
});
