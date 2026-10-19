import { test, expect } from "@playwright/test";

// ─── Auth flows ───────────────────────────────────────────────────────────────

test.describe("Registration", () => {
  test("shows validation errors for empty form", async ({ page }) => {
    await page.goto("/register");
    await page.click("button[type='submit']");
    // Browser's native validation kicks in — form won't submit
    await expect(page).toHaveURL("/register");
  });

  test("shows error for duplicate username", async ({ page }) => {
    await page.goto("/register");
    await page.fill("#displayName", "Test User");
    await page.fill("#username", "existinguser");
    await page.fill("#reg-email", "new@example.com");
    await page.fill("#reg-password", "password123");
    await page.click("button[type='submit']");
    // Error message should appear
    await expect(page.locator(".error-text, [style*='color: #f87171']")).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Login", () => {
  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", "nonexistent@example.com");
    await page.fill("#password", "wrongpassword");
    await page.click("button[type='submit']");
    await expect(
      page.locator("text=Invalid email or password")
    ).toBeVisible({ timeout: 5000 });
  });

  test("redirects to dashboard after successful login", async ({ page }) => {
    // This test requires a seeded test user in the DB
    // Skipped if env vars not set
    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;
    if (!testEmail || !testPassword) {
      test.skip();
      return;
    }
    await page.goto("/login");
    await page.fill("#email", testEmail);
    await page.fill("#password", testPassword);
    await page.click("button[type='submit']");
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });
});

test.describe("Protected routes", () => {
  test("redirects unauthenticated users from /dashboard to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated users from /focus to /login", async ({
    page,
  }) => {
    await page.goto("/focus");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated users from /stats to /login", async ({
    page,
  }) => {
    await page.goto("/stats");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated users from /notifications to /login", async ({
    page,
  }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated users from /profile to /login", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Landing page", () => {
  test("shows correct title and CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/FocusForge/);
    await expect(page.locator("h1")).toContainText("Forge your focus");
    await expect(page.locator("a[href='/register']").first()).toBeVisible();
  });

  test("has working navigation links", async ({ page }) => {
    await page.goto("/");
    const loginLink = page.locator("a[href='/login']").first();
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL("/login");
  });
});

test.describe("Timer page UI", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly (unauthenticated) — should redirect
    await page.goto("/focus");
    const url = page.url();
    if (url.includes("/login")) {
      test.skip();
    }
  });

  test("shows timer controls", async ({ page }) => {
    await expect(page.locator("#timer-start-btn")).toBeVisible();
  });

  test("shows 25:00 countdown by default", async ({ page }) => {
    await expect(page.locator("text=25:00")).toBeVisible();
  });
});

test.describe("Forgot password page", () => {
  test("shows email input and submit button", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("#forgot-email")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("shows confirmation after submit", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.fill("#forgot-email", "test@example.com");
    await page.click("button[type='submit']");
    await expect(page.locator("text=Check your email")).toBeVisible({
      timeout: 5000,
    });
  });
});
