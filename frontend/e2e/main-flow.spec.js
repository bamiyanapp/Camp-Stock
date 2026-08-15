import { test, expect } from "@playwright/test";
import { loginAsE2EUser } from "./auth.js";
import { captureScreenshot } from "./screenshot.js";

// ログイン→キャンプ作成→持ち物を選ぶ→積み込みチェック、という主要フローを
// 通しで検証する。キャンプ作成時、backend/e2e/testServer.jsが用意する
// 車キャンプ向けの持ち物（テント・コンロ・さいふ）は自動的に「今回使う」
// 状態で選択されるため、「持ち物を選ぶ」画面では不要なもの（コンロ）を
// 外す操作を検証する。
test("ログイン→キャンプ作成→持ち物を選ぶ→積み込みチェックの一連の流れ", async ({
  page,
  context,
  baseURL,
}) => {
  await loginAsE2EUser(context, {
    baseURL,
    sub: "e2e-main-flow-user",
    name: "E2Eユーザー",
    email: "e2e-main-flow-user@example.com",
  });

  await page.goto("/");
  await captureScreenshot(page, "01-camp-list", "キャンプ一覧画面");

  await page.getByPlaceholder("キャンプ名").fill("夏キャンプ");
  await page.getByRole("button", { name: "キャンプを作成" }).click();

  const campLink = page.getByRole("link", { name: "夏キャンプ（車）" });
  await expect(campLink).toBeVisible();
  await captureScreenshot(page, "02-camp-created", "キャンプ作成後の一覧画面");

  await campLink.click();
  await expect(page.getByRole("heading", { name: "夏キャンプ（車）" })).toBeVisible();
  // 作成直後は移動手段（車）に対応する持ち物が自動的に「今回使う」状態になる
  await expect(page.getByText("テント")).toBeVisible();
  await expect(page.getByText("コンロ")).toBeVisible();
  await captureScreenshot(page, "03-camp-detail-initial", "キャンプ詳細画面（作成直後）");

  await page.getByRole("link", { name: "持ち物を選ぶ" }).click();
  await expect(page.getByLabel("コンロを今回使う")).toBeChecked();
  await captureScreenshot(page, "04-item-selection", "持ち物選択画面");

  // 今回はコンロを持っていかないことにする
  await page.getByLabel("コンロを今回使う").uncheck();

  await page.getByRole("link", { name: "← 夏キャンプへ戻る" }).click();
  await expect(page.getByRole("heading", { name: "夏キャンプ（車）" })).toBeVisible();
  await expect(page.getByText("テント")).toBeVisible();
  await expect(page.getByText("コンロ")).not.toBeVisible();
  await captureScreenshot(page, "05-camp-detail-after-selection", "持ち物選択後のキャンプ詳細画面");

  // チェック後は「積んだ」item.packed=trueとなり、デフォルト表示の未済タブ
  // からは即座に外れる（DOM上のcheckboxが消える）ため、checked状態の維持を
  // 待つcheck()ではなくclick()を使う。
  await page.getByLabel("テントを積んだ").click();
  await expect(page.getByText("使用予定 2件中 1件 積み込み済み")).toBeVisible();
  await captureScreenshot(page, "06-camp-detail-packed", "積み込みチェック後のキャンプ詳細画面");
});
