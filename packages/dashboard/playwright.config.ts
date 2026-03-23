import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveBrowserExecutable() {
  const envPath = process.env.PLAYWRIGHT_BROWSER_EXECUTABLE;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/microsoft-edge",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
          ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

const executablePath = resolveBrowserExecutable();

export default defineConfig({
  testDir: path.resolve(dirname, "tests/e2e"),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    browserName: "chromium",
    headless: true,
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    {
      name: "mocked-dashboard",
      testMatch: /dashboard\.spec\.ts/,
      use: {
        baseURL: "http://127.0.0.1:4173",
      },
    },
    {
      name: "real-stack",
      testMatch: /real\.spec\.ts/,
      use: {
        baseURL: "http://127.0.0.1:4785",
      },
    },
  ],
  webServer: [
    {
      command: "pnpm preview --host 127.0.0.1 --port 4173",
      cwd: dirname,
      port: 4173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "node tests/e2e/launch-real-server.mjs",
      cwd: dirname,
      port: 4785,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
