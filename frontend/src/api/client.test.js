import { describe, it, expect, vi, beforeEach } from "vitest";
import { api, setUnauthorizedHandler, exchangeGoogleIdTokenForSession } from "./client.js";

function mockFetchOnce(status, body) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe("api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("listItems: GET /items を呼び出す", async () => {
    mockFetchOnce(200, [{ itemId: "1", name: "テント" }]);
    const result = await api.listItems();
    expect(result).toEqual([{ itemId: "1", name: "テント" }]);
    expect(fetch).toHaveBeenCalledWith(
      "/items",
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it("createCamp: POST /camps へbodyを渡す", async () => {
    mockFetchOnce(201, { campId: "1", name: "夏キャンプ" });
    const result = await api.createCamp({ name: "夏キャンプ", vehicleType: "car" });
    expect(result.campId).toBe("1");
    expect(fetch).toHaveBeenCalledWith(
      "/camps",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "夏キャンプ", vehicleType: "car" }),
      })
    );
  });

  it("deleteItem: 204レスポンスはnullを返す", async () => {
    mockFetchOnce(204, null);
    const result = await api.deleteItem("1");
    expect(result).toBeNull();
  });

  it("エラーレスポンスの場合はmessageを含むErrorを投げる", async () => {
    mockFetchOnce(404, { message: "item not found: missing" });
    await expect(api.listItems()).rejects.toThrow("item not found: missing");
  });

  it("401の場合、バックエンドのエラーメッセージを添えてonUnauthorizedハンドラを呼ぶ", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockFetchOnce(401, { message: "認証情報が無効です" });
    await expect(api.listItems()).rejects.toThrow("ログインが必要です");
    expect(onUnauthorized).toHaveBeenCalledWith("認証情報が無効です");
    setUnauthorizedHandler(null);
  });

  it("401でレスポンス本文が読めない場合は既定のメッセージでonUnauthorizedを呼ぶ", async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => {
        throw new Error("invalid json");
      },
    });
    await expect(api.listItems()).rejects.toThrow("ログインが必要です");
    expect(onUnauthorized).toHaveBeenCalledWith("認証情報が無効です");
    setUnauthorizedHandler(null);
  });

  it("exchangeGoogleIdTokenForSession: Google IDトークンをBearerで送りセッショントークンを受け取る", async () => {
    mockFetchOnce(200, { sessionToken: "session-token" });
    const result = await exchangeGoogleIdTokenForSession("google-id-token");
    expect(result).toEqual({ sessionToken: "session-token" });
    expect(fetch).toHaveBeenCalledWith(
      "/auth/session",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer google-id-token" }),
      })
    );
  });

  it("exchangeGoogleIdTokenForSession: エラーレスポンスの場合はmessageを含むErrorを投げる", async () => {
    mockFetchOnce(401, { message: "Google IDトークンが無効です" });
    await expect(exchangeGoogleIdTokenForSession("bad-token")).rejects.toThrow(
      "Google IDトークンが無効です"
    );
  });

  it("updateItem: PUT /items/:itemId へbodyを渡す", async () => {
    mockFetchOnce(200, { itemId: "1", name: "テント2" });
    const result = await api.updateItem("1", { name: "テント2" });
    expect(result.name).toBe("テント2");
    expect(fetch).toHaveBeenCalledWith(
      "/items/1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ name: "テント2" }) })
    );
  });

  it("listCamps: GET /camps を呼び出す", async () => {
    mockFetchOnce(200, [{ campId: "1" }]);
    const result = await api.listCamps();
    expect(result).toEqual([{ campId: "1" }]);
    expect(fetch).toHaveBeenCalledWith("/camps", expect.objectContaining({}));
  });

  it("getCamp: GET /camps/:campId を呼び出す", async () => {
    mockFetchOnce(200, { campId: "1" });
    const result = await api.getCamp("1");
    expect(result.campId).toBe("1");
    expect(fetch).toHaveBeenCalledWith("/camps/1", expect.objectContaining({}));
  });

  it("updateCamp: PUT /camps/:campId へbodyを渡す", async () => {
    mockFetchOnce(200, { campId: "1", name: "改名後" });
    const result = await api.updateCamp("1", { name: "改名後" });
    expect(result.name).toBe("改名後");
    expect(fetch).toHaveBeenCalledWith(
      "/camps/1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ name: "改名後" }) })
    );
  });

  it("deleteCamp: DELETE /camps/:campId を呼び出す", async () => {
    mockFetchOnce(204, null);
    const result = await api.deleteCamp("1");
    expect(result).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/camps/1", expect.objectContaining({ method: "DELETE" }));
  });

  it("listCampMembers: GET /camps/:campId/members を呼び出す", async () => {
    mockFetchOnce(200, [{ userId: "1" }]);
    const result = await api.listCampMembers("1");
    expect(result).toEqual([{ userId: "1" }]);
    expect(fetch).toHaveBeenCalledWith("/camps/1/members", expect.objectContaining({}));
  });

  it("regenerateCampInviteToken: POST /camps/:campId/invite-token を呼び出す", async () => {
    mockFetchOnce(200, { inviteToken: "abc" });
    const result = await api.regenerateCampInviteToken("1");
    expect(result.inviteToken).toBe("abc");
    expect(fetch).toHaveBeenCalledWith(
      "/camps/1/invite-token",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("joinCamp: POST /camps/join へinviteTokenを渡す", async () => {
    mockFetchOnce(200, { campId: "1" });
    const result = await api.joinCamp("abc");
    expect(result.campId).toBe("1");
    expect(fetch).toHaveBeenCalledWith(
      "/camps/join",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ inviteToken: "abc" }) })
    );
  });

  it("listCampItems: GET /camps/:campId/items を呼び出す", async () => {
    mockFetchOnce(200, [{ itemId: "1" }]);
    const result = await api.listCampItems("1");
    expect(result).toEqual([{ itemId: "1" }]);
    expect(fetch).toHaveBeenCalledWith("/camps/1/items", expect.objectContaining({}));
  });

  it("setCampItemUsed: PUT /camps/:campId/items/:itemId へusedを渡す", async () => {
    mockFetchOnce(200, { itemId: "1", used: true });
    const result = await api.setCampItemUsed("1", "1", true);
    expect(result.used).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "/camps/1/items/1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ used: true }) })
    );
  });

  it("setCampItemPacked: PUT /camps/:campId/items/:itemId へpackedを渡す", async () => {
    mockFetchOnce(200, { itemId: "1", packed: true });
    const result = await api.setCampItemPacked("1", "1", true);
    expect(result.packed).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "/camps/1/items/1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ packed: true }) })
    );
  });

  it("setCampItemAssignee: PUT /camps/:campId/items/:itemId へassignedUserIdを渡す", async () => {
    mockFetchOnce(200, { itemId: "1", assignedUserId: "user-1" });
    const result = await api.setCampItemAssignee("1", "1", "user-1");
    expect(result.assignedUserId).toBe("user-1");
    expect(fetch).toHaveBeenCalledWith(
      "/camps/1/items/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ assignedUserId: "user-1" }),
      })
    );
  });
});
