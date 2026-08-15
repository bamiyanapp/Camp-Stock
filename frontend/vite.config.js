import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// semantic-releaseが更新するルートpackage.jsonのバージョンをビルド時に埋め込む
// （frontend/package.jsonのversionはsemantic-releaseの対象外のため使わない）
const rootPackageVersion = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url))
).version;

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPackageVersion),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  // dev-standards submoduleからsymlinkで共有しているコンポーネント
  // （docs/shared-ui-components.md等）がnpmパッケージ（qrcode.react等）に
  // 依存する場合、このpreserveSymlinksが無いとVite/Node.jsがsymlinkの実体パス
  // （dev-standards配下）を起点にnode_modulesを探索してしまい、このアプリ自身の
  // node_modulesにインストール済みのパッケージを解決できない。共有コンポーネントを
  // 1つも使わない場合でも、後から追加する可能性を考えて既定で入れておく
  resolve: {
    preserveSymlinks: true,
  },
  // __BASE_PATH__: MkDocs等の静的サイトの特定サブパスへビルド成果物を配置する
  // 構成の場合、サイトルートではなくそのサブパスを指定する（例: '/settings/foo/'）。
  // サイトルート自体に配置する場合はこのオプション自体を削除してよい
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    // e2e/配下はPlaywright（npm run test:e2e）専用のテストで、vitest（npm test）
    // の対象から除外する。含めると@playwright/testのtest()呼び出しが
    // vitestランナー内で実行され、実行時エラーになる。
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
