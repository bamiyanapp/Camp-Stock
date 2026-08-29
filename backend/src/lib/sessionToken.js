import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./errors.js";

// Googleが発行するIDトークンは有効期限が約1時間でGoogle側の管理下にあり
// 延長できない。初回ログイン時にIDトークンを検証した後は、バックエンドが
// 自社発行するこの長期セッショントークン（HS256 JWT）でAPIリクエストを
// 認証する（dev-standards docs/serverless-api-dynamodb-pattern.md
// 「認証パターン（Cognitoを使わない）」参照）。
export function signSessionToken(user, { secret, expiresInSeconds }) {
  return jwt.sign(
    { email: user.email, name: user.name, picture: user.picture },
    secret,
    { subject: user.userId, expiresIn: expiresInSeconds, algorithm: "HS256" }
  );
}

function verifySessionToken(token, { secret }) {
  const payload = jwt.verify(token, secret, { algorithms: ["HS256"] });
  return {
    userId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

// router.jsのauthenticate(headers)インターフェースを実装する。secretを
// DI可能にすることで、テストでは固定のsecretで署名・検証できる。
export function createSessionAuthenticator({ secret }) {
  return async function authenticate(headers) {
    const authHeader = headers?.authorization || headers?.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("認証情報がありません");
    }
    const token = authHeader.slice("Bearer ".length);
    try {
      return verifySessionToken(token, { secret });
    } catch {
      throw new UnauthorizedError("認証情報が無効です");
    }
  };
}
