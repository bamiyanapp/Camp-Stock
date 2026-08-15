import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CampJoinPage from "./CampJoinPage.jsx";
import CampDetailPage from "./CampDetailPage.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { api } from "../api/client.js";

vi.mock("../api/client.js", () => ({
  api: {
    joinCamp: vi.fn(),
    getCamp: vi.fn(),
    listCampItems: vi.fn(),
    listCampMembers: vi.fn(),
  },
  setAuthToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/join/invite-token-1"]}>
        <Routes>
          <Route path="/join/:inviteToken" element={<CampJoinPage />} />
          <Route path="/camps/:campId" element={<CampDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("CampJoinPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getCamp.mockResolvedValue({
      campId: "camp-1",
      name: "夏キャンプ",
      vehicleType: "car",
      ownerUserId: "owner-sub",
    });
    api.listCampItems.mockResolvedValue([]);
    api.listCampMembers.mockResolvedValue([]);
  });

  it("マウント時に招待トークンで参加し、キャンプ詳細画面へ遷移する", async () => {
    api.joinCamp.mockResolvedValue({ campId: "camp-1", name: "夏キャンプ" });
    renderPage();

    expect(await screen.findByText("夏キャンプ（車）")).toBeInTheDocument();
    expect(api.joinCamp).toHaveBeenCalledWith("invite-token-1");
  });

  it("参加に失敗した場合、エラーメッセージとキャンプ一覧へのリンクを表示する", async () => {
    api.joinCamp.mockRejectedValue(new Error("invite token not found"));
    renderPage();

    expect(await screen.findByText("invite token not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "キャンプ一覧へ戻る" })).toHaveAttribute("href", "/");
  });
});
