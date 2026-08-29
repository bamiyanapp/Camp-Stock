const STORAGE_KEY = "camp-stock-id-token";

function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64url");
}

// backend/e2e/testServer.jsのfake authenticatorが読み取れる、JWTと同じ形式
// （header.payload.signature、署名検証はしない）のfakeなセッショントークンを
// 発行する。実際のバックエンド（backend/src/lib/sessionToken.js）が発行する
// セッショントークンも、Googleが発行するIDトークンも同じJWT形式のため、
// fake authenticator側はどちらであるかを区別しない。frontend側はjwt-decode
// でpayloadをそのまま表示に使うため、AuthContext.jsxが期待する
// sub/name/email/pictureのクレームを含める。
export function createFakeSessionToken({ sub, name, email, picture }) {
  const header = base64UrlEncode({ alg: "none" });
  const payload = base64UrlEncode({ sub, name, email, picture });
  return `${header}.${payload}.signature`;
}

// 実際のGoogleログインフロー・POST /auth/sessionでのトークン交換を一切
// 経由せず、AuthContext.jsxが読むCookie（camp-stock-id-token。Cookie名自体は
// セッショントークン方式への切り替え後も互換のため変更していない）へ
// 直接fakeなセッショントークンを注入してログイン状態からテストを開始する。
// page.goto()より前に呼び出すこと。
export async function loginAsE2EUser(context, { baseURL, sub, name, email, picture }) {
  const token = createFakeSessionToken({ sub, name, email, picture });
  const { hostname } = new URL(baseURL);
  await context.addCookies([
    {
      name: STORAGE_KEY,
      value: token,
      domain: hostname,
      path: "/",
    },
  ]);
  return token;
}
