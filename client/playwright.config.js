// Playwright browser tests. Run from client/:
//   npm run build && npm run e2e
// The web server below starts an in-memory database + real API + the build.
const { defineConfig } = require("@playwright/test");

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "e2e/report", open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    // Uses the installed Google Chrome, so no browser download is needed.
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: Object.entries(viewports).map(([name, viewport]) => ({
    name,
    use: { viewport, isMobile: name === "mobile", hasTouch: name !== "desktop" },
  })),
  webServer: {
    command: "node e2e/stack.js",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
