import { defineConfig, devices } from "@playwright/test";

const FRONTEND_PORT = 5175;
const BACKEND_PORT = 4001;

// backend/e2e/testServer.js（in-memory repository・fake authenticator）と
// Viteのdevサーバーの両方をwebServerとして自動起動し、実AWS・実Google認証
// 無しでE2Eテストを完結させる。
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: "on-first-retry",
    // ローカルにpinバージョンと異なるChromiumしか無い環境向けの明示的な
    // 上書き先。未設定時はPlaywright標準の自動検出に任せる（CIはこちら）。
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node ../backend/e2e/testServer.js",
      url: `http://localhost:${BACKEND_PORT}/healthz`,
      env: { PORT: String(BACKEND_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      env: {
        VITE_API_BASE_URL: `http://localhost:${BACKEND_PORT}`,
        VITE_GOOGLE_CLIENT_ID: "e2e-test-client-id.apps.googleusercontent.com",
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
