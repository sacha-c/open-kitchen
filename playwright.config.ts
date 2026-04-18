import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "pnpm db:seed && pnpm build && pnpm preview",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  testDir: "e2e",
  testMatch: "**/*.e2e.{ts,js}",
});
