import { OAuth2Client } from "google-auth-library";
import { UnauthorizedError } from "./errors.js";

// oAuth2Clientを注入可能にすることで、テストではGoogle APIへの実通信を
// 行わないfakeに差し替えられるようにする。ヘッダー解析は含まず、Googleの
// IDトークン文字列そのものを検証する純粋な関数。初回ログイン時のセッション
// トークン発行（services/authService.js）から呼び出される。
export async function verifyGoogleIdToken({ idToken, clientId, oAuth2Client }) {
  const client = oAuth2Client || new OAuth2Client(clientId);

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
}
