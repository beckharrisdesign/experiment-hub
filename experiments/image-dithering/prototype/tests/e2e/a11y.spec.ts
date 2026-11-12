import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FIXTURE, expectRendered } from "./helpers";

// Test 18: zero axe violations before and after an image is loaded.
test("axe: no violations on first load", async ({ page }) => {
  await page.goto("/");
  await expectRendered(page, "Pick an effect", 8);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});

test("axe: no violations after an image is loaded", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Choose an image").setInputFiles(FIXTURE);
  await expectRendered(page, "Pick an effect", 8);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
});
