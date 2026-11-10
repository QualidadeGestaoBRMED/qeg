import { randomBytes } from "node:crypto";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.BASE_URL;
const username = process.env.E2E_USERNAME;
const password = process.env.E2E_PASSWORD;

if (!baseURL && (!username || !password || !process.env.DATABASE_URL)) {
  throw new Error(
    "Sem BASE_URL, o servidor local precisa de E2E_USERNAME, E2E_PASSWORD e DATABASE_URL (Postgres local com db:setup).",
  );
}

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  use: {
    baseURL: baseURL ?? "http://127.0.0.1:8080",
    trace: "retain-on-failure",
    launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
  },
  webServer: baseURL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 8080 --strictPort",
        url: "http://127.0.0.1:8080",
        reuseExistingServer: false,
        env: {
          ...(process.env as Record<string, string>),
          AUTH_USERNAME: username!,
          AUTH_PASSWORD: password!,
          SESSION_SECRET: process.env.SESSION_SECRET ?? randomBytes(32).toString("hex"),
        },
      },
});
