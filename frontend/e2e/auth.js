const STORAGE_KEY = "camp-stock-id-token";

function base64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64url");
}

// backend/e2e/testServer.jsのfake authenticatorが読み取れる、JWTと同じ形式
// （header.payload.signature、署名検証はしない）のfakeなIDトークンを発行する。
// frontend側はjwt-decodeでpayloadをそのまま表示に使うため、AuthContext.jsxが
// 期待するsub/name/email/pictureのクレームを含める。
export function createFakeIdToken({ sub, name, email, picture }) {
  const header = base64UrlEncode({ alg: "none" });
  const payload = base64UrlEncode({ sub, name, email, picture });
  return `${header}.${payload}.signature`;
}

// 実際のGoogleログインフローを一切経由せず、AuthContext.jsxが読むCookie
// （camp-stock-id-token）へ直接fakeなIDトークンを注入してログイン状態から
// テストを開始する。page.goto()より前に呼び出すこと。
export async function loginAsE2EUser(context, { baseURL, sub, name, email, picture }) {
  const token = createFakeIdToken({ sub, name, email, picture });
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
