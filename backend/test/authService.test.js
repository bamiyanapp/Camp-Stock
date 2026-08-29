import { describe, it, expect } from "vitest";
import { createAuthService } from "../src/services/authService.js";
import { createSessionAuthenticator } from "../src/lib/sessionToken.js";

function fakeOAuth2Client({ verifyIdToken }) {
  return { verifyIdToken };
}

describe("createAuthService", () => {
  it("有効なGoogle IDトークンからセッショントークンとユーザー情報を発行する", async () => {
    const oAuth2Client = fakeOAuth2Client({
      verifyIdToken: async () => ({
        getPayload: () => ({
          sub: "user-1",
          email: "user@example.com",
          name: "Test User",
          picture: "https://example.com/p.png",
        }),
      }),
    });
    const authService = createAuthService({
      googleClientId: "client-id",
      oAuth2Client,
      sessionSecret: "test-secret",
      sessionMaxAgeSeconds: 60,
    });

    const { sessionToken, user } = await authService.issueSessionFromGoogleIdToken("google-id-token");
    expect(user).toEqual({
      userId: "user-1",
      email: "user@example.com",
      name: "Test User",
      picture: "https://example.com/p.png",
    });

    // 発行したセッショントークンが、実際にrouter.jsのauthenticateインターフェース
    // （createSessionAuthenticator）で検証できることも確認する
    const authenticate = createSessionAuthenticator({ secret: "test-secret" });
    const authenticatedUser = await authenticate({ authorization: `Bearer ${sessionToken}` });
    expect(authenticatedUser).toEqual(user);
  });

  it("Google IDトークンの検証に失敗した場合はセッショントークンを発行しない", async () => {
    const oAuth2Client = fakeOAuth2Client({
      verifyIdToken: async () => {
        throw new Error("invalid token");
      },
    });
    const authService = createAuthService({
      googleClientId: "client-id",
      oAuth2Client,
      sessionSecret: "test-secret",
      sessionMaxAgeSeconds: 60,
    });

    await expect(authService.issueSessionFromGoogleIdToken("invalid-token")).rejects.toThrow(
      /認証情報が無効です/
    );
  });
});
