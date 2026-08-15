import { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "./errors.js";

// oAuth2Clientを注入可能にすることで、テストではGoogle APIへの実通信を
// 行わないfakeに差し替えられるようにする。
export function createGoogleAuthenticator({ clientId, oAuth2Client }) {
  const client = oAuth2Client || new OAuth2Client(clientId);

  return async function authenticate(headers) {
    const authHeader = headers?.authorization || headers?.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("認証情報がありません");
    }
    const idToken = authHeader.slice("Bearer ".length);

    let payload;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedError("認証情報が無効です");
    }
    if (!payload?.sub) {
      throw new UnauthorizedError("認証情報が無効です");
    }

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  };
}
