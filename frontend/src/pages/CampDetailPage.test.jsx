import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CampDetailPage from "./CampDetailPage.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { api } from "../api/client.js";

const STORAGE_KEY = "camp-stock-id-token";

vi.mock("../api/client.js", () => ({
  api: {
    getCamp: vi.fn(),
    listCampItems: vi.fn(),
    listCampMembers: vi.fn(),
    setCampItemPacked: vi.fn(),
    regenerateCampInviteToken: vi.fn(),
  },
  setAuthToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}));

// btoaはLatin1範囲外の文字（日本語名等）を扱えないため、UTF-8バイト列に
// 変換してからエンコードする。
function base64UrlEncode(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// jwt-decodeは署名検証を行わずpayloadをbase64url decodeするだけのため、
// テストではダミーの署名を持つJWT形式の文字列で十分。
function fakeIdToken(payload) {
  return `${base64UrlEncode({ alg: "none" })}.${base64UrlEncode(payload)}.signature`;
}

function setSessionCookie(payload) {
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(fakeIdToken(payload))}; Path=/`;
}

function clearSessionCookie() {
  document.cookie = `${STORAGE_KEY}=; Path=/; Max-Age=0`;
}

function renderPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/camps/camp-1"]}>
        <Routes>
          <Route path="/camps/:campId" element={<CampDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe("CampDetailPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearSessionCookie();
    api.getCamp.mockResolvedValue({
      campId: "camp-1",
      name: "夏キャンプ",
      vehicleType: "car",
      ownerUserId: "owner-sub",
      inviteToken: "invite-token-1",
    });
    api.listCampMembers.mockResolvedValue([]);
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

  it("絵文字が設定された持ち物は、品名とともに絵文字を表示する", async () => {
    api.listCampItems.mockResolvedValue([
      {
        itemId: "item-2",
        name: "さいふ",
        emoji: "👛",
        category: "携帯品",
        vehicleType: "both",
        used: true,
        packed: false,
      },
    ]);
    renderPage();
    await screen.findByText("さいふ");
    expect(screen.getByText("👛")).toBeInTheDocument();
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

  it("チェックボックスの切り替えでは一覧を再取得せず、対象アイテムを楽観的に更新して未済一覧から外す", async () => {
    const user = userEvent.setup();
    api.setCampItemPacked.mockResolvedValue({});
    renderPage();
    await screen.findByText("さいふ");
    expect(api.listCampItems).toHaveBeenCalledTimes(1);

    const walletRow = screen.getByText("さいふ").closest("li");
    const checkbox = walletRow.querySelector('input[type="checkbox"]');
    await user.click(checkbox);

    await waitFor(() => {
      expect(api.setCampItemPacked).toHaveBeenCalledWith("camp-1", "item-2", true);
    });
    // 積み込み済みになったため、未済タブ（デフォルト）からは消える
    expect(screen.queryByText("さいふ")).not.toBeInTheDocument();
    // reload()を伴わないため、一覧の再取得は初回マウント時の1回のみ
    expect(api.listCampItems).toHaveBeenCalledTimes(1);
  });

  it("APIリクエストが失敗した場合、対象の持ち物を未済一覧に戻す", async () => {
    const user = userEvent.setup();
    api.setCampItemPacked.mockRejectedValue(new Error("更新に失敗しました"));
    renderPage();
    await screen.findByText("さいふ");

    const walletRow = screen.getByText("さいふ").closest("li");
    const checkbox = walletRow.querySelector('input[type="checkbox"]');
    await user.click(checkbox);

    await waitFor(() => {
      expect(screen.getByText("更新に失敗しました")).toBeInTheDocument();
    });
    // 失敗時は未済に戻るため、未済タブ（デフォルト）に再度表示される
    const walletRowAfter = screen.getByText("さいふ").closest("li");
    expect(walletRowAfter.querySelector('input[type="checkbox"]')).not.toBeChecked();
  });

  describe("積み込み済み/未済の表示切り替え", () => {
    beforeEach(() => {
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
          used: true,
          packed: true,
        },
      ]);
    });

    it("デフォルトでは未積み込みの持ち物のみを表示する", async () => {
      renderPage();
      expect(await screen.findByText("テント")).toBeInTheDocument();
      expect(screen.queryByText("さいふ")).not.toBeInTheDocument();
    });

    it("「積み込み済み」タブに切り替えると積み込み済みの持ち物のみ表示する", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("テント");

      await user.click(screen.getByRole("tab", { name: "積み込み済み" }));

      expect(screen.getByText("さいふ")).toBeInTheDocument();
      expect(screen.queryByText("テント")).not.toBeInTheDocument();
    });

    it("「積み込み済み」タブから「未済」タブに戻すと未積み込みの持ち物のみ表示する", async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("テント");

      await user.click(screen.getByRole("tab", { name: "積み込み済み" }));
      await user.click(screen.getByRole("tab", { name: "未済" }));

      expect(screen.getByText("テント")).toBeInTheDocument();
      expect(screen.queryByText("さいふ")).not.toBeInTheDocument();
    });

    it("該当する持ち物が無いタブを選ぶと案内文を表示する", async () => {
      api.listCampItems.mockResolvedValue([
        {
          itemId: "item-1",
          name: "テント",
          category: "住",
          vehicleType: "car",
          used: true,
          packed: false,
        },
      ]);
      const user = userEvent.setup();
      renderPage();
      await screen.findByText("テント");

      await user.click(screen.getByRole("tab", { name: "積み込み済み" }));

      expect(screen.getByText("積み込み済みの持ち物はありません。")).toBeInTheDocument();
    });
  });

  describe("招待リンク・参加者", () => {
    it("参加者一覧をバッジで表示する", async () => {
      api.listCampMembers.mockResolvedValue([
        { userId: "owner-sub", role: "owner", name: "オーナー", email: null },
        { userId: "member-sub", role: "member", name: "参加者", email: null },
      ]);
      renderPage();
      await screen.findByText("夏キャンプ（車）");

      expect(screen.getByText("オーナー（作成者）")).toBeInTheDocument();
      expect(screen.getByText("参加者")).toBeInTheDocument();
    });

    it("所有者としてログインしている場合、招待リンクが表示される", async () => {
      setSessionCookie({ sub: "owner-sub", name: "オーナー" });
      renderPage();
      await screen.findByText("夏キャンプ（車）");

      const inviteInput = screen.getByLabelText("招待リンク");
      expect(inviteInput.value).toContain("/join/invite-token-1");
    });

    it("招待リンク欄は既定で折り畳まれている", async () => {
      setSessionCookie({ sub: "owner-sub", name: "オーナー" });
      renderPage();
      await screen.findByText("夏キャンプ（車）");

      const details = screen.getByText("招待リンク").closest("details");
      expect(details).not.toHaveAttribute("open");
    });

    it("所有者以外としてログインしている場合、招待リンクは表示されない", async () => {
      setSessionCookie({ sub: "member-sub", name: "参加者" });
      renderPage();
      await screen.findByText("夏キャンプ（車）");

      expect(screen.queryByLabelText("招待リンク")).not.toBeInTheDocument();
    });

    it("未ログイン状態では招待リンクは表示されない", async () => {
      renderPage();
      await screen.findByText("夏キャンプ（車）");

      expect(screen.queryByLabelText("招待リンク")).not.toBeInTheDocument();
    });

    it("「再発行」ボタンでregenerateCampInviteTokenを呼び、新しいリンクに更新する", async () => {
      const user = userEvent.setup();
      setSessionCookie({ sub: "owner-sub", name: "オーナー" });
      api.regenerateCampInviteToken.mockResolvedValue({
        campId: "camp-1",
        name: "夏キャンプ",
        vehicleType: "car",
        ownerUserId: "owner-sub",
        inviteToken: "invite-token-2",
      });
      renderPage();
      await screen.findByText("夏キャンプ（車）");

      await user.click(screen.getByRole("button", { name: "再発行" }));

      await waitFor(() => {
        expect(api.regenerateCampInviteToken).toHaveBeenCalledWith("camp-1");
      });
      await waitFor(() => {
        expect(screen.getByLabelText("招待リンク").value).toContain("/join/invite-token-2");
      });
    });

    it("「QRコードで共有」ボタンで招待リンクのQRコードを表示する", async () => {
      const user = userEvent.setup();
      setSessionCookie({ sub: "owner-sub", name: "オーナー" });
      renderPage();
      await screen.findByText("夏キャンプ（車）");

      await user.click(screen.getByRole("button", { name: "QRコードで共有" }));

      expect(screen.getByText((text) => text.includes("/join/invite-token-1"))).toBeInTheDocument();
    });
  });

  describe("担当者表示", () => {
    it("担当者が割り当てられている持ち物は担当者名をバッジで表示する", async () => {
      api.listCampMembers.mockResolvedValue([
        { userId: "owner-sub", role: "owner", name: "オーナー", email: null },
        { userId: "member-sub", role: "member", name: "参加者", email: null },
      ]);
      api.listCampItems.mockResolvedValue([
        {
          itemId: "item-2",
          name: "さいふ",
          category: "携帯品",
          vehicleType: "both",
          used: true,
          packed: false,
          assignedUserId: "member-sub",
        },
      ]);
      renderPage();
      await screen.findByText("さいふ");

      const walletRow = screen.getByText("さいふ").closest("li");
      expect(walletRow).toHaveTextContent("参加者");
    });

    it("担当者が未割り当ての持ち物にはバッジを表示しない", async () => {
      api.listCampItems.mockResolvedValue([
        {
          itemId: "item-2",
          name: "さいふ",
          category: "携帯品",
          vehicleType: "both",
          used: true,
          packed: false,
          assignedUserId: null,
        },
      ]);
      renderPage();
      await screen.findByText("さいふ");

      const walletRow = screen.getByText("さいふ").closest("li");
      expect(walletRow.querySelector(".badge")).not.toBeInTheDocument();
    });
  });
});
