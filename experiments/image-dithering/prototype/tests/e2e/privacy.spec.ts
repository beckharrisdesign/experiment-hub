import { expect, test } from "@playwright/test";
import { FIXTURE, expectRendered, step } from "./helpers";

// Test 21: no network request carries image data during upload and export.
test("no request is made with image data during upload and export", async ({ page, baseURL }) => {
  await page.goto("/");
  await expectRendered(page, "Pick an effect", 8);
  const after: { url: string; method: string; body: number }[] = [];
  page.on("request", (r) => after.push({ url: r.url(), method: r.method(), body: r.postDataBuffer()?.length ?? 0 }));

  await page.getByLabel("Choose an image").setInputFiles(FIXTURE);
  await expectRendered(page, "Pick an effect", 8);
  const effect = step(page, "Pick an effect");
  await effect.getByRole("button", { name: "Stucki" }).click();
  await effect.getByRole("button", { name: /^Next/ }).click();
  await step(page, "Fine-tune").getByRole("button", { name: /^Next/ }).click();
  const exp = step(page, "Export");
  await exp.getByRole("button", { name: "Laser" }).click();
  await Promise.all([page.waitForEvent("download"), exp.getByRole("button", { name: "Download PNG" }).click()]);

  const offending = after.filter((r) => {
    const sameOrigin = r.url.startsWith(baseURL!) || r.url.startsWith("blob:") || r.url.startsWith("data:");
    return r.method !== "GET" || r.body > 0 || !sameOrigin;
  });
  expect(offending).toEqual([]);
  // Nothing other than blob: downloads should be requested at all once the page is up.
  expect(after.filter((r) => !r.url.startsWith("blob:")).map((r) => r.url)).toEqual([]);
});
