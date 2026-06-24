import { test, expect } from "@playwright/test";

// Credentials for two distinct test accounts. Set via environment variables so
// real passwords never land in source. Create these accounts in Supabase before
// running the suite. Each account should have at least one seed.
const USER_A = {
  email: process.env.E2E_USER_A_EMAIL ?? "",
  password: process.env.E2E_USER_A_PASSWORD ?? "",
};

const USER_B = {
  email: process.env.E2E_USER_B_EMAIL ?? "",
  password: process.env.E2E_USER_B_PASSWORD ?? "",
};

test.describe("cross-account isolation", () => {
  test.beforeEach(() => {
    // Skip if test credentials are not configured
    test.skip(
      !USER_A.email || !USER_B.email,
      "E2E_USER_A_EMAIL and E2E_USER_B_EMAIL must be set",
    );
  });

  test("signing out and into a different account shows only that account's seeds", async ({
    page,
  }) => {
    // 1. Sign in as User A
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(USER_A.email);
    await page.getByLabel(/password/i).fill(USER_A.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/");

    // 2. Record a seed name visible to User A
    const firstSeedText = await page
      .getByTestId("seed-card")
      .first()
      .textContent();
    expect(firstSeedText).toBeTruthy();

    // 3. Sign out
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL("/login");

    // 4. Sign in as User B
    await page.getByLabel(/email/i).fill(USER_B.email);
    await page.getByLabel(/password/i).fill(USER_B.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/");

    // 5. Wait for the seed list to settle — check that User A's seed is absent
    await page.waitForSelector('[data-testid="seed-card"]', {
      state: "visible",
      timeout: 10_000,
    });

    const allSeedTexts = await page.getByTestId("seed-card").allTextContents();

    expect(allSeedTexts).not.toContain(firstSeedText);
  });

  test("a newly created account sees an empty seed list, not another user's seeds", async ({
    page,
  }) => {
    test.skip(!USER_A.email, "E2E_USER_A_EMAIL must be set");

    // 1. Sign in as User A to confirm they have seeds
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(USER_A.email);
    await page.getByLabel(/password/i).fill(USER_A.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/");
    const userACardCount = await page.getByTestId("seed-card").count();
    expect(userACardCount).toBeGreaterThan(0);

    // 2. Sign out
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL("/login");

    // 3. Sign up as a fresh account
    const freshEmail = `e2e-fresh-${Date.now()}@example.com`;
    await page.getByRole("link", { name: /sign up|create account/i }).click();
    await page.getByLabel(/email/i).fill(freshEmail);
    await page.getByLabel(/password/i).fill("TestPassword123!");
    await page.getByRole("button", { name: /sign up|create account/i }).click();
    await page.waitForURL("/");

    // 4. New account should have zero seeds
    const freshCardCount = await page.getByTestId("seed-card").count();
    expect(freshCardCount).toBe(0);
  });
});
