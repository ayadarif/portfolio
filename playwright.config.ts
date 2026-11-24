import { defineConfig } from "@playwright/test";

// Runs against the production build: `npm run build` first, then `npx playwright test`.
export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.e2e\.ts/,
  timeout: 60_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3100" },
  webServer: { command: "npx next start -p 3100", url: "http://localhost:3100", reuseExistingServer: !process.env.CI, timeout: 60_000 },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
