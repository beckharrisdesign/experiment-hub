import { expect, test } from "@playwright/test";
import { FIXTURE, expectRendered, pngInfo, readDownload, step } from "./helpers";

// Test 17: the whole flow without a mouse.
test("keyboard only: upload, pick an effect, fine-tune, laser + material, download", async ({ page }) => {
  await page.goto("/");
  const input = page.getByLabel("Choose an image");
  // Tab until the file input has focus, then hand it a file (what the OS picker would do).
  for (let i = 0; i < 20 && !(await input.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await input.setInputFiles(FIXTURE);
  await expectRendered(page, "Pick an effect", 8);

  const pressOn = async (locator: ReturnType<typeof page.getByRole>, key = "Enter") => {
    for (let i = 0; i < 60 && !(await locator.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(locator).toBeFocused();
    await page.keyboard.press(key);
  };

  const effect = step(page, "Pick an effect");
  await pressOn(effect.getByRole("button", { name: "Atkinson" }), "Space");
  await expect(effect.getByRole("button", { name: "Atkinson" })).toHaveAttribute("aria-pressed", "true");
  await pressOn(effect.getByRole("button", { name: /^Next/ }));
  await expectRendered(page, "Fine-tune", 4);
  await pressOn(step(page, "Fine-tune").getByRole("button", { name: /^Next/ }));

  const exp = step(page, "Export");
  await pressOn(exp.getByRole("button", { name: "Laser" }));
  await pressOn(exp.getByRole("button", { name: "Wood" }));
  await expect(page).toHaveURL(/material=wood/);

  const downloadP = page.waitForEvent("download");
  await pressOn(exp.getByRole("button", { name: "Download PNG" }));
  const info = pngInfo(readDownload((await (await downloadP).path())!));
  expect(info.ppmX).toBe(11811);
});
