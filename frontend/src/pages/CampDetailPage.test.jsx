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
    setCampItemUsed: vi.fn(),
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

  it("キャンプ名とカテゴリ別の持ち物候補を表示する", async () => {
    renderPage();
    expect(await screen.findByText("夏キャンプ（車）")).toBeInTheDocument();
    expect(screen.getByText("住")).toBeInTheDocument();
    expect(screen.getByText("テント")).toBeInTheDocument();
    expect(screen.getByText("携帯品")).toBeInTheDocument();
    expect(screen.getByText("さいふ")).toBeInTheDocument();
  });

  it("「今回使う」「積んだ」の表記はヘッダーに一度だけ表示し、各行には表示しない", async () => {
    renderPage();
    await screen.findByText("テント");
    expect(screen.getAllByText("今回使う")).toHaveLength(1);
    expect(screen.getAllByText("積んだ")).toHaveLength(1);
  });

  it("used=falseのアイテムには積み込みチェックボックスを表示しない", async () => {
    renderPage();
    await screen.findByText("テント");
    const tentRow = screen.getByText("テント").closest("li");
    expect(tentRow.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
  });

  it("used=trueのアイテムには積み込みチェックボックスを表示する", async () => {
    renderPage();
    await screen.findByText("さいふ");
    const walletRow = screen.getByText("さいふ").closest("li");
    expect(walletRow.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  });

  it("「今回使う」チェックボックスでsetCampItemUsedを呼ぶ", async () => {
    const user = userEvent.setup();
    api.setCampItemUsed.mockResolvedValue({});
    renderPage();
    await screen.findByText("テント");

    const tentRow = screen.getByText("テント").closest("li");
    const checkbox = tentRow.querySelector('input[type="checkbox"]');
    await user.click(checkbox);

    await waitFor(() => {
      expect(api.setCampItemUsed).toHaveBeenCalledWith("camp-1", "item-1", true);
    });
  });

  it("「積んだ」チェックボックスでsetCampItemPackedを呼ぶ", async () => {
    const user = userEvent.setup();
    api.setCampItemPacked.mockResolvedValue({});
    renderPage();
    await screen.findByText("さいふ");

    const walletRow = screen.getByText("さいふ").closest("li");
    const checkboxes = walletRow.querySelectorAll('input[type="checkbox"]');
    await user.click(checkboxes[1]);

    await waitFor(() => {
      expect(api.setCampItemPacked).toHaveBeenCalledWith("camp-1", "item-2", true);
    });
  });
});
