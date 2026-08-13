import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./client.js";

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
});
