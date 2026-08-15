import { test, expect } from "@playwright/test";
import { loginAsE2EUser } from "./auth.js";

test("ログイン状態でキャンプ一覧画面が表示される", async ({ page, context, baseURL }) => {
  await loginAsE2EUser(context, {
    baseURL,
    sub: "e2e-smoke-user",
    name: "スモークテストユーザー",
    email: "e2e-smoke-user@example.com",
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Camp Stock/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "キャンプ一覧" })).toBeVisible();
  await expect(
    page.getByText("Camp Stockを利用するにはGoogleアカウントでログインしてください")
  ).not.toBeVisible();
});
