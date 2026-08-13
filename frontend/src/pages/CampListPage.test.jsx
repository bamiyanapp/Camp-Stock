import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CampListPage from "./CampListPage.jsx";
import { api } from "../api/client.js";

vi.mock("../api/client.js", () => ({
  api: {
    listCamps: vi.fn(),
    createCamp: vi.fn(),
    deleteCamp: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CampListPage />
    </MemoryRouter>
  );
}

describe("CampListPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listCamps.mockResolvedValue([
      { campId: "1", name: "夏キャンプ", vehicleType: "car", date: "2026-08-01" },
    ]);
  });

  it("キャンプ一覧を表示する", async () => {
    renderPage();
    expect(await screen.findByText("夏キャンプ（車）")).toBeInTheDocument();
  });

  it("フォーム送信でキャンプを作成し、一覧を再取得する", async () => {
    const user = userEvent.setup();
    api.createCamp.mockResolvedValue({ campId: "2", name: "冬キャンプ" });
    renderPage();
    await screen.findByText("夏キャンプ（車）");

    await user.type(screen.getByPlaceholderText("キャンプ名"), "冬キャンプ");
    await user.click(screen.getByRole("button", { name: "キャンプを作成" }));

    await waitFor(() => {
      expect(api.createCamp).toHaveBeenCalledWith(
        expect.objectContaining({ name: "冬キャンプ", vehicleType: "car" })
      );
    });
    expect(api.listCamps).toHaveBeenCalledTimes(2);
  });

  it("削除ボタンでキャンプを削除する", async () => {
    const user = userEvent.setup();
    api.deleteCamp.mockResolvedValue(null);
    renderPage();
    await screen.findByText("夏キャンプ（車）");

    await user.click(screen.getByRole("button", { name: "削除" }));

    await waitFor(() => {
      expect(api.deleteCamp).toHaveBeenCalledWith("1");
    });
  });
});
