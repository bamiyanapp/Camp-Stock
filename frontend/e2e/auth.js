import { loginAsE2EUser as loginAsE2EUserWithCookieName } from "./fakeSessionToken.js";

export { createFakeSessionToken } from "./fakeSessionToken.js";

// AuthContext.jsxが読むCookie名。セッショントークン方式への切り替え後も
// 互換のため変更していない。自社発行セッショントークン方式のE2E認証バイパス
// 自体は共通化されており（dev-standards#404）、実体は
// dev-standards/shared/e2e/fakeSessionToken.js（symlink）。Cookie名は
// プロダクトごとに異なるため、このファイルで固定して渡す薄いラッパー。
const STORAGE_KEY = "camp-stock-id-token";

export async function loginAsE2EUser(context, { baseURL, sub, name, email, picture }) {
  return loginAsE2EUserWithCookieName(context, {
    baseURL,
    cookieName: STORAGE_KEY,
    sub,
    name,
    email,
    picture,
  });
}
