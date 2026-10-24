import { test, expect, chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

test.describe("Chrome Extension E2E in Real Browser", () => {
  const extensionPath = path.resolve("apps/extension/dist");
  let tempUserDataDir: string;

  test.beforeAll(async () => {
    // Ensure extension is built
    expect(fs.existsSync(path.join(extensionPath, "manifest.json"))).toBe(true);
  });

  test("loads unpacked extension, inspects popup & blocked pages, and verifies DNR dynamic rule interception", async () => {
    tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-chrome-ext-"));

    const chromeAppPath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    const launchOptions: any = {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        "--no-sandbox",
        "--disable-gpu",
      ],
    };

    if (fs.existsSync(chromeAppPath)) {
      launchOptions.executablePath = chromeAppPath;
    }

    const context = await chromium.launchPersistentContext(tempUserDataDir, launchOptions);

    try {
      // 1. Locate the background service worker or extension ID
      let [backgroundPage] = context.serviceWorkers();
      if (!backgroundPage) {
        backgroundPage = await context.waitForEvent("serviceworker", { timeout: 10000 });
      }

      const extensionId = backgroundPage.url().split("/")[2];
      expect(extensionId).toBeDefined();
      console.log("Loaded Chrome Extension with ID:", extensionId);

      // 2. Open Extension Popup page
      const popupPage = await context.newPage();
      await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);

      // Verify popup UI renders
      await expect(popupPage.locator(".brand-title")).toHaveText("FocusForge");
      await expect(popupPage.locator(".brand-subtitle")).toHaveText("Distraction Blocker");
      await expect(popupPage.locator("#connectionText")).toHaveText("Disconnected");
      await expect(popupPage.locator("#pairingCodeInput")).toBeVisible();
      await expect(popupPage.locator("#pairBtn")).toBeVisible();

      // 3. Open Extension Blocked page
      const blockedPage = await context.newPage();
      await blockedPage.goto(`chrome-extension://${extensionId}/blocked.html`);

      await expect(blockedPage.locator(".headline")).toHaveText("Stay in the Zone!");
      await expect(blockedPage.locator(".brand-tag")).toHaveText("FocusForge Distraction Shield");
      await expect(blockedPage.locator("#openFocusBtn")).toBeVisible();
      await expect(blockedPage.locator("#openSettingsBtn")).toBeVisible();

      // 4. Test real browser DNR dynamic rule blocking
      // Configure dynamic blocking rule for "example.org" via background worker
      const ruleApplied = await backgroundPage.evaluate(async () => {
        // @ts-ignore
        const chromeExt = chrome;
        await chromeExt.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [1],
          addRules: [
            {
              id: 1,
              priority: 1,
              action: {
                type: "redirect",
                redirect: {
                  extensionPath: "/blocked.html",
                },
              },
              condition: {
                urlFilter: "||example.org^",
                resourceTypes: ["main_frame"],
              },
            },
          ],
        });
        const rules = await chromeExt.declarativeNetRequest.getDynamicRules();
        return rules.length;
      });

      expect(ruleApplied).toBe(1);

      // Navigate to the blocked domain: http://example.org/
      const navPage = await context.newPage();
      await navPage.goto("http://example.org/", { timeout: 15000 });

      // Verify that declarativeNetRequest intercepted the navigation and redirected to /blocked.html
      expect(navPage.url()).toContain(`chrome-extension://${extensionId}/blocked.html`);
      await expect(navPage.locator(".headline")).toHaveText("Stay in the Zone!");

      // 5. Test rule removal upon session completion / unblocking
      const ruleCleared = await backgroundPage.evaluate(async () => {
        // @ts-ignore
        const chromeExt = chrome;
        await chromeExt.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [1],
          addRules: [],
        });
        const rules = await chromeExt.declarativeNetRequest.getDynamicRules();
        return rules.length;
      });

      expect(ruleCleared).toBe(0);

      await context.close();
    } finally {
      try {
        fs.rmSync(tempUserDataDir, { recursive: true, force: true });
      } catch {}
    }
  });
});
