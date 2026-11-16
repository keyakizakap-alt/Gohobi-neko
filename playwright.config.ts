import { defineConfig, devices } from "@playwright/test";
import webpush from "web-push";

// プッシュ通知の E2E 用：テストのたびに使い捨ての鍵を作り、実際には送らない（PUSH_DRY_RUN）
const vapid = webpush.generateVAPIDKeys();
export const TEST_CRON_SECRET = "e2e-cron-secret";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false, // 古いビルドのサーバーを誤って使わないため
    env: {
      PUSH_ALLOW_MEMORY: "1",
      PUSH_DRY_RUN: "1",
      VAPID_PUBLIC_KEY: vapid.publicKey,
      VAPID_PRIVATE_KEY: vapid.privateKey,
      VAPID_SUBJECT: "https://example.com",
      CRON_SECRET: TEST_CRON_SECRET,
    },
    timeout: 180_000,
  },
});
