import { describe, it, expect } from "vitest";
import { signSessionToken, createSessionAuthenticator } from "../src/lib/sessionToken.js";

const SECRET = "test-secret";

describe("signSessionToken / createSessionAuthenticator", () => {
  it("署名したセッショントークンからユーザー情報を復元する", async () => {
    const token = signSessionToken(
      { userId: "user-1", email: "user@example.com", name: "Test User", picture: "https://example.com/p.png" },
      { secret: SECRET, expiresInSeconds: 60 }
    );
    const authenticate = createSessionAuthenticator({ secret: SECRET });

    const user = await authenticate({ authorization: `Bearer ${token}` });
    expect(user).toEqual({
      userId: "user-1",
      email: "user@example.com",
      name: "Test User",
      picture: "https://example.com/p.png",
    });
  });

  it("Authorizationヘッダーが無ければUnauthorizedErrorを投げる", async () => {
    const authenticate = createSessionAuthenticator({ secret: SECRET });
    await expect(authenticate({})).rejects.toThrow(/認証情報がありません/);
  });

  it("Bearer形式でなければUnauthorizedErrorを投げる", async () => {
    const authenticate = createSessionAuthenticator({ secret: SECRET });
    await expect(authenticate({ authorization: "Basic xxx" })).rejects.toThrow(/認証情報がありません/);
  });

  it("秘密鍵が異なるトークンはUnauthorizedErrorを投げる", async () => {
    const token = signSessionToken(
      { userId: "user-1" },
      { secret: "other-secret", expiresInSeconds: 60 }
    );
    const authenticate = createSessionAuthenticator({ secret: SECRET });
    await expect(authenticate({ authorization: `Bearer ${token}` })).rejects.toThrow(/認証情報が無効です/);
  });

  it("有効期限が切れたトークンはUnauthorizedErrorを投げる", async () => {
    const token = signSessionToken({ userId: "user-1" }, { secret: SECRET, expiresInSeconds: -1 });
    const authenticate = createSessionAuthenticator({ secret: SECRET });
    await expect(authenticate({ authorization: `Bearer ${token}` })).rejects.toThrow(/認証情報が無効です/);
  });

  it("改ざんされたトークンはUnauthorizedErrorを投げる", async () => {
    const token = signSessionToken({ userId: "user-1" }, { secret: SECRET, expiresInSeconds: 60 });
    const tampered = `${token.slice(0, -1)}${token.at(-1) === "a" ? "b" : "a"}`;
    const authenticate = createSessionAuthenticator({ secret: SECRET });
    await expect(authenticate({ authorization: `Bearer ${tampered}` })).rejects.toThrow(/認証情報が無効です/);
  });
});
