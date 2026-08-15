import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// reusable-ci.ymlのE2Eスクリーンショット報告機能（Job Summary・PRコメントへの
// 画像直接埋め込み）が読み取るディレクトリへPNGを書き出す。captionを渡すと
// レポート上の見出しに使われる（省略時はファイル名がそのまま使われる）。
const SCREENSHOT_DIR = path.join(import.meta.dirname, "../e2e-screenshots");

export async function captureScreenshot(page, name, caption) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
  if (caption) {
    writeFileSync(path.join(SCREENSHOT_DIR, `${name}.caption.txt`), caption, "utf-8");
  }
}
