import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import sonarjs from "eslint-plugin-sonarjs";

export default [
  {
    ignores: [
      "dist",
      "coverage",
      "monocart-report",
      "playwright-report",
      // dev-standards submoduleからのsymlink（sync-manifest.local.json参照）。
      // 実体をdev-standards側が所有・lintしており、参照側で指摘が出ても
      // symlink先を書き換えることになるためその場で修正できない
      // （docs/code-quality-conventions.md「stylelint」節と同じ理由）
      "public/sw.js",
      "src/components/ServiceWorkerRegistration.jsx",
      "src/components/UpdateNotifier.jsx",
      "src/components/formatBuildTime.js",
      "getAppVersionDefine.js",
      "e2e/fakeSessionToken.js",
      "e2e/coverageFixture.js",
    ],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
        // vite.config.jsのdefineで埋め込むビルド時定数（getAppVersionDefine.js参照）
        __APP_VERSION__: "readonly",
        __APP_BUILD_TIME__: "readonly",
      },
    },
    plugins: {
      sonarjs,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...sonarjs.configs.recommended.rules,
      // eslint-plugin-react-hooksのrecommendedは、rules-of-hooks/exhaustive-deps以外に
      // React Compiler対応を前提にした新しいルール（set-state-in-effect等）を多数含み、
      // 既存のデータ取得パターン（useEffectでのreload呼び出し等）を広範に書き換える
      // 必要が生じる。本移行の目的はcomplexity/sonarjs/no-unused-varsの導入であり、
      // React Compiler対応は範囲外のため、従来oxlintで検知していた範囲に近い
      // rules-of-hooks・exhaustive-depsのみを個別に有効化する
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      complexity: ["error", 15],
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
    },
  },
  {
    // テストファイルはケースの列挙で自然に行数が伸びるため、
    // ファイル分割を促すmax-linesの対象から外す
    files: ["**/*.test.jsx", "**/*.test.js"],
    rules: { "max-lines": "off" },
  },
];
