import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 60000,
  retries: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "npm.cmd run dev -- --port 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: false,
    timeout: 120000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] }
    }
  ]
});
