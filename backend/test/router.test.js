import { describe, it, expect } from "vitest";
import { createRouter } from "../src/router.js";

describe("createRouter", () => {
  const routes = [
    {
      method: "GET",
      path: "/camps/{campId}/items/{itemId}",
      handler: async ({ params }) => ({ statusCode: 200, body: params }),
    },
    {
      method: "GET",
      path: "/camps",
      handler: async () => ({ statusCode: 200, body: "list" }),
    },
  ];
  const router = createRouter(routes);

  it("パスパラメータを抽出してハンドラに渡す", async () => {
    const result = await router.handleRequest({
      method: "GET",
      path: "/camps/camp-1/items/item-1",
      body: {},
    });
    expect(result).toEqual({
      statusCode: 200,
      body: { campId: "camp-1", itemId: "item-1" },
    });
  });

  it("固定パスにマッチする", async () => {
    const result = await router.handleRequest({
      method: "GET",
      path: "/camps",
      body: {},
    });
    expect(result).toEqual({ statusCode: 200, body: "list" });
  });

  it("マッチしない場合は404を返す", async () => {
    const result = await router.handleRequest({
      method: "POST",
      path: "/unknown",
      body: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("セグメント数が異なる場合はマッチしない", async () => {
    const result = await router.handleRequest({
      method: "GET",
      path: "/camps/camp-1",
      body: {},
    });
    expect(result.statusCode).toBe(404);
  });

  it("ハンドラが投げたエラーのstatusCodeをレスポンスに反映する", async () => {
    const errorRoutes = [
      {
        method: "GET",
        path: "/boom",
        handler: async () => {
          const error = new Error("not found");
          error.statusCode = 404;
          throw error;
        },
      },
    ];
    const errorRouter = createRouter(errorRoutes);
    const result = await errorRouter.handleRequest({
      method: "GET",
      path: "/boom",
      body: {},
    });
    expect(result).toEqual({ statusCode: 404, body: { message: "not found" } });
  });
});
