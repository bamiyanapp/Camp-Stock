import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, "..");

// index.html・manifest.jsonは静的ファイル（Reactコンポーネントではない）だが、
// iOS Safariでホーム画面に追加した際に正式なPWAとして認識されるための
// 設定が欠落・破損するとユーザーには気づきにくいため、内容を検証する
// （#87: iPhoneのホーム画面追加アプリでセッションが保持されない対策）。
describe("PWA関連の静的ファイル", () => {
  it("index.htmlがmanifest.json・apple-touch-icon・iOS向けmetaタグを参照する", () => {
    const html = readFileSync(join(frontendRoot, "index.html"), "utf-8");
    expect(html).toContain('<link rel="manifest" href="/manifest.json" />');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
  });

  it("manifest.jsonがstandalone表示・アイコンを定義する", () => {
    const manifest = JSON.parse(
      readFileSync(join(frontendRoot, "public", "manifest.json"), "utf-8")
    );
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      expect(existsSync(join(frontendRoot, "public", icon.src.replace(/^\//, "")))).toBe(true);
    }
  });

  it("apple-touch-icon.pngが実ファイルとして存在する", () => {
    expect(existsSync(join(frontendRoot, "public", "apple-touch-icon.png"))).toBe(true);
  });
});
