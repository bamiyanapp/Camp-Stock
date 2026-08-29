import { verifyGoogleIdToken } from "../lib/googleAuth.js";
import { signSessionToken } from "../lib/sessionToken.js";

// Google IDトークンの検証は、このサービス経由の初回ログイン時のみ行う。
// 以降のAPIリクエストは、ここで発行するセッショントークンで認証される
// （routes/index.jsの POST /auth/session、router.jsのauthenticate）。
export function createAuthService({
  googleClientId,
  oAuth2Client,
  sessionSecret,
  sessionMaxAgeSeconds,
}) {
  return {
    async issueSessionFromGoogleIdToken(googleIdToken) {
      const user = await verifyGoogleIdToken({
        idToken: googleIdToken,
        clientId: googleClientId,
        oAuth2Client,
      });
      const sessionToken = signSessionToken(user, {
        secret: sessionSecret,
        expiresInSeconds: sessionMaxAgeSeconds,
      });
      return { sessionToken, user };
    },
  };
}
