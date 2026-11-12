import { expect, test } from "@playwright/test";
import { FIXTURE, expectRendered, pngInfo, readDownload, step } from "./helpers";

// Test 16 (adapted to round 02.4: material lives in Export → Laser).
test("upload → 8 thumbnails → laser + slate in the URL → 300 DPI PNG at 100 × 75 mm", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Choose an image").setInputFiles(FIXTURE);

  await expectRendered(page, "Pick an effect", 8);
  const effect = step(page, "Pick an effect");
  await effect.getByRole("button", { name: "Jarvis–Judice–Ninke" }).click();
  await effect.getByRole("button", { name: /^Next/ }).click();

  await expectRendered(page, "Fine-tune", 4);
  await step(page, "Fine-tune").getByRole("button", { name: /^Next/ }).click();

  const exp = step(page, "Export");
  await exp.getByRole("button", { name: "Laser" }).click();
  await exp.getByRole("button", { name: "Slate" }).click();
  await expect(page).toHaveURL(/[?&]material=slate\b/);
  await expect(exp.getByRole("switch", { name: /Invert/ })).toBeChecked();

  const [download] = await Promise.all([page.waitForEvent("download"), exp.getByRole("button", { name: "Download PNG" }).click()]);
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const info = pngInfo(readDownload((await download.path())!));
  // 400 × 300 fixture at 100 mm wide → 75 mm tall → 1181 × 886 px at 300 DPI.
  expect([info.width, info.height]).toEqual([1181, 886]);
  expect([info.ppmX, info.ppmY, info.unit]).toEqual([11811, 11811, 1]);
});

test("later steps stay locked, with no previews, until the step above has a pick", async ({ page }) => {
  await page.goto("/");
  await expectRendered(page, "Pick an effect", 8); // the sample image fills step 2
  await expect(step(page, "Fine-tune").locator("[data-tile]")).toHaveCount(0);
  await expect(step(page, "Fine-tune").getByText(/press Next/i)).toBeVisible();
});

test("Halftone switch shows eight halftone screens", async ({ page }) => {
  await page.goto("/");
  const effect = step(page, "Pick an effect");
  await effect.getByRole("button", { name: "Halftone" }).click();
  await expect(effect.getByRole("button", { name: "Halftone" })).toHaveAttribute("aria-pressed", "true");
  await expectRendered(page, "Pick an effect", 8);
  await expect(effect.getByRole("button", { name: /Round dots/ })).toBeVisible();
});

test("?material=acrylic reaches Export already set for laser, mirror and invert on", async ({ page }) => {
  await page.goto("/?material=acrylic");
  await expectRendered(page, "Pick an effect", 8);
  const effect = step(page, "Pick an effect");
  await effect.getByRole("button", { name: "Floyd–Steinberg" }).click();
  await effect.getByRole("button", { name: /^Next/ }).click();
  await step(page, "Fine-tune").getByRole("button", { name: /^Next/ }).click();
  const exp = step(page, "Export");
  await expect(exp.getByRole("button", { name: "Laser" })).toHaveAttribute("aria-pressed", "true");
  await expect(exp.getByRole("button", { name: "Acrylic" })).toHaveAttribute("aria-pressed", "true");
  await expect(exp.getByRole("switch", { name: /Mirror/ })).toBeChecked();
  await expect(exp.getByRole("switch", { name: /Invert/ })).toBeChecked();
});

// Copilot review on PR #591: a material's invert/mirror/DPI were lost after going back and re-picking.
test("a laser material survives going back and picking a different effect", async ({ page }) => {
  await page.goto("/");
  await expectRendered(page, "Pick an effect", 8);
  const effect = step(page, "Pick an effect");
  await effect.getByRole("button", { name: "Floyd–Steinberg" }).click();
  await effect.getByRole("button", { name: /^Next/ }).click();
  await step(page, "Fine-tune").getByRole("button", { name: /^Next/ }).click();
  const exp = step(page, "Export");
  await exp.getByRole("button", { name: "Laser" }).click();
  await exp.getByRole("button", { name: "Slate" }).click();
  await expect(exp.getByRole("switch", { name: /Invert/ })).toBeChecked();

  await exp.getByRole("button", { name: /Back to fine-tune/ }).click();
  await step(page, "Fine-tune").getByRole("button", { name: /Back to effect/ }).click();
  await expectRendered(page, "Pick an effect", 8);
  await effect.getByRole("button", { name: "Atkinson" }).click();
  await effect.getByRole("button", { name: /^Next/ }).click();
  await step(page, "Fine-tune").getByRole("button", { name: /^Next/ }).click();

  await expect(exp.getByRole("button", { name: "Slate" })).toHaveAttribute("aria-pressed", "true");
  await expect(exp.getByRole("switch", { name: /Invert/ })).toBeChecked();
  await expect(page).toHaveURL(/material=slate/);
});

test("switching back to Screen clears the laser-only invert and mirror", async ({ page }) => {
  await page.goto("/?material=acrylic");
  await expectRendered(page, "Pick an effect", 8);
  const effect = step(page, "Pick an effect");
  await effect.getByRole("button", { name: "Stucki" }).click();
  await effect.getByRole("button", { name: /^Next/ }).click();
  await step(page, "Fine-tune").getByRole("button", { name: /^Next/ }).click();
  const exp = step(page, "Export");
  await exp.getByRole("button", { name: "Screen or print" }).click();
  await exp.getByRole("button", { name: "Laser" }).click();
  await expect(exp.getByRole("switch", { name: /Mirror/ })).not.toBeChecked();
  await expect(exp.getByRole("switch", { name: /Invert/ })).not.toBeChecked();
  await expect(page).not.toHaveURL(/material=/);
});
