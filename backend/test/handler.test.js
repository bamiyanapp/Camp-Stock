import { describe, it, expect } from "vitest";
import { handler } from "../src/handler.js";

describe("handler", () => {
  it("OPTIONSリクエストにはrouterを経由せず204を返す（プリフライト対応）", async () => {
    const result = await handler({
      requestContext: { http: { method: "OPTIONS" } },
      rawPath: "/camps",
    });
    expect(result.statusCode).toBe(204);
  });

  it("存在しないパスへのGETは404を返す", async () => {
    const result = await handler({
      requestContext: { http: { method: "GET" } },
      rawPath: "/unknown",
    });
    expect(result.statusCode).toBe(404);
  });

  it("不正なJSONボディは400を返す", async () => {
    const result = await handler({
      requestContext: { http: { method: "POST" } },
      rawPath: "/camps",
      body: "not-json",
    });
    expect(result.statusCode).toBe(400);
  });
});
