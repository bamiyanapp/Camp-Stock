import { describe, it, expect } from "vitest";
import { verifyGoogleIdToken } from "../src/lib/googleAuth.js";

function fakeOAuth2Client({ verifyIdToken }) {
  return { verifyIdToken };
}

describe("verifyGoogleIdToken", () => {
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

    const user = await verifyGoogleIdToken({
      idToken: "valid-token",
      clientId: "client-id",
      oAuth2Client,
    });
    expect(user).toEqual({
      userId: "user-1",
      email: "user@example.com",
      name: "Test User",
    });
  });

  it("トークン検証が失敗したらUnauthorizedErrorを投げる", async () => {
    const oAuth2Client = fakeOAuth2Client({
      verifyIdToken: async () => {
        throw new Error("invalid token");
      },
    });

    await expect(
      verifyGoogleIdToken({ idToken: "invalid-token", clientId: "client-id", oAuth2Client })
    ).rejects.toThrow(/認証情報が無効です/);
  });

  it("ペイロードにsubが無ければUnauthorizedErrorを投げる", async () => {
    const oAuth2Client = fakeOAuth2Client({
      verifyIdToken: async () => ({ getPayload: () => ({}) }),
    });

    await expect(
      verifyGoogleIdToken({ idToken: "token", clientId: "client-id", oAuth2Client })
    ).rejects.toThrow(/認証情報が無効です/);
  });
});
