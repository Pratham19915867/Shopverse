import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";
dotenv.config({ path: ".env", quiet: true });

export default defineConfig({
  testDir: "./tests",
  timeout: 90000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "line",
  outputDir: "artifacts/test-results",
  use: {
    baseURL: process.env.SHOPVERSE_TEST_URL || "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
    headless: true,
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
