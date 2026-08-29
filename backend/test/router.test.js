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

describe("createRouter with authenticate", () => {
  const routes = [
    {
      method: "GET",
      path: "/camps",
      handler: async ({ user }) => ({ statusCode: 200, body: { user } }),
    },
  ];

  it("認証に成功した場合、userをハンドラへ渡す", async () => {
    const authenticate = async () => ({ userId: "user-1" });
    const router = createRouter(routes, { authenticate });
    const result = await router.handleRequest({
      method: "GET",
      path: "/camps",
      headers: { authorization: "Bearer valid-token" },
      body: {},
    });
    expect(result).toEqual({ statusCode: 200, body: { user: { userId: "user-1" } } });
  });

  it("認証に失敗した場合、ハンドラを呼ばずエラーのstatusCodeを返す", async () => {
    const authenticate = async () => {
      const error = new Error("認証情報がありません");
      error.statusCode = 401;
      throw error;
    };
    const router = createRouter(routes, { authenticate });
    const result = await router.handleRequest({
      method: "GET",
      path: "/camps",
      headers: {},
      body: {},
    });
    expect(result).toEqual({
      statusCode: 401,
      body: { message: "認証情報がありません" },
    });
  });

  it("authenticateを渡さない場合はuser=nullでハンドラを呼ぶ（後方互換）", async () => {
    const router = createRouter(routes);
    const result = await router.handleRequest({
      method: "GET",
      path: "/camps",
      body: {},
    });
    expect(result).toEqual({ statusCode: 200, body: { user: null } });
  });

  it("route.skipAuth: trueの場合、authenticateを呼ばずuser=nullでハンドラを呼ぶ", async () => {
    const skipAuthRoutes = [
      {
        method: "POST",
        path: "/auth/session",
        skipAuth: true,
        handler: async ({ user, headers }) => ({ statusCode: 200, body: { user, headers } }),
      },
    ];
    const authenticate = async () => {
      throw new Error("skipAuthのルートでauthenticateが呼ばれてはいけない");
    };
    const router = createRouter(skipAuthRoutes, { authenticate });

    const result = await router.handleRequest({
      method: "POST",
      path: "/auth/session",
      headers: { authorization: "Bearer google-id-token" },
      body: {},
    });
    expect(result.statusCode).toBe(200);
    expect(result.body.user).toBeNull();
    expect(result.body.headers).toEqual({ authorization: "Bearer google-id-token" });
  });
});
