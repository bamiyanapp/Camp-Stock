import { describe, it, expect } from "vitest";
import { createGoogleAuthenticator } from "../src/lib/googleAuth.js";

function fakeOAuth2Client({ verifyIdToken }) {
  return { verifyIdToken };
}

describe("createGoogleAuthenticator", () => {
  it("有効なIDトークンからユーザー情報を返す", async () => {
    const oAuth2Client = fakeOAuth2Client({
      verifyIdToken: async () => ({
        getPayload: () => ({
          sub: "user-1",
          email: "user@example.com",
          name: "Test User",
        }),
      }),
    });
    const authenticate = createGoogleAuthenticator({
      clientId: "client-id",
      oAuth2Client,
    });

    const user = await authenticate({ authorization: "Bearer valid-token" });
    expect(user).toEqual({
      userId: "user-1",
      email: "user@example.com",
      name: "Test User",
    });
  });

  it("Authorizationヘッダーが無ければUnauthorizedErrorを投げる", async () => {
    const authenticate = createGoogleAuthenticator({
      clientId: "client-id",
      oAuth2Client: fakeOAuth2Client({ verifyIdToken: async () => {} }),
    });
    await expect(authenticate({})).rejects.toThrow(/認証情報がありません/);
  });

  it("Bearer形式でなければUnauthorizedErrorを投げる", async () => {
    const authenticate = createGoogleAuthenticator({
      clientId: "client-id",
      oAuth2Client: fakeOAuth2Client({ verifyIdToken: async () => {} }),
    });
    await expect(
      authenticate({ authorization: "Basic xxx" })
    ).rejects.toThrow(/認証情報がありません/);
  });

  it("トークン検証が失敗したらUnauthorizedErrorを投げる", async () => {
    const oAuth2Client = fakeOAuth2Client({
      verifyIdToken: async () => {
        throw new Error("invalid token");
      },
    });
    const authenticate = createGoogleAuthenticator({
      clientId: "client-id",
      oAuth2Client,
    });
    await expect(
      authenticate({ authorization: "Bearer invalid-token" })
    ).rejects.toThrow(/認証情報が無効です/);
  });

  it("ペイロードにsubが無ければUnauthorizedErrorを投げる", async () => {
    const oAuth2Client = fakeOAuth2Client({
      verifyIdToken: async () => ({ getPayload: () => ({}) }),
    });
    const authenticate = createGoogleAuthenticator({
      clientId: "client-id",
      oAuth2Client,
    });
    await expect(
      authenticate({ authorization: "Bearer token" })
    ).rejects.toThrow(/認証情報が無効です/);
  });

  it("小文字・大文字どちらのAuthorizationヘッダーキーも受け付ける", async () => {
    const oAuth2Client = fakeOAuth2Client({
      verifyIdToken: async () => ({
        getPayload: () => ({ sub: "user-1" }),
      }),
    });
    const authenticate = createGoogleAuthenticator({
      clientId: "client-id",
      oAuth2Client,
    });
    const user = await authenticate({ Authorization: "Bearer valid-token" });
    expect(user.userId).toBe("user-1");
  });
});
