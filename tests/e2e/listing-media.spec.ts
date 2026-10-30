import { test, expect } from "@playwright/test";
test("Hallwyl Photos and 360° Tour are keyboard operable and release the iframe", async ({
  page,
}) => {
  await page.goto("/viewer");
  const photos = page.getByRole("button", { name: "Photos", exact: true }),
    tour = page.getByRole("button", { name: "360° Tour", exact: true });
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator("#listing-media img")).toHaveCount(5);
  await page
    .getByRole("button", { name: "View Morning Room photograph" })
    .click();
  await expect(page.locator(".museum-feature-photo img")).toHaveAttribute(
    "alt",
    /Morning Room/,
  );
  const before = (await page.locator("#listing-media").boundingBox())!;
  await tour.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "http://127.0.0.1:3216/aw360/v/1e00029c-d4ff-4a22-8d5b-c95d10ae3f57",
  );
  await expect(page.locator("iframe")).toHaveAttribute("allow", "fullscreen");
  const iframe = await page.locator("iframe").elementHandle();
  const after = (await page.locator("#listing-media").boundingBox())!;
  expect(Math.abs(before.height - after.height)).toBeLessThan(2);
  await photos.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(await iframe!.evaluate((node) => node.isConnected)).toBe(false);
  await expect(page.locator(".museum-feature-photo img")).toHaveAttribute(
    "alt",
    /Morning Room/,
  );
  await page.getByRole("link", { name: "Explore in 360°" }).click();
  await expect(page.locator("iframe")).toHaveCount(1);
});
for (const viewport of [
  { name: "desktop", width: 1440, height: 1080 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`Hallwyl ${viewport.name} visual smoke`, async ({ page }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/viewer");
    await expect(page).toHaveTitle(
      "Hallwyl Museum — Interactive 360° Experience | ArchWalk",
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Hallwyl Museum.",
    );
    await expect(page.locator(".museum-room-card")).toHaveCount(4);
    await expect(
      page.getByText(
        "Independent interactive demonstration powered by ArchWalk 360. Not an official Hallwyl Museum website.",
      ),
    ).toBeVisible();
    for (const photo of await page.locator("img").all())
      await expect
        .poll(() =>
          photo.evaluate((node) => (node as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
    expect(
      await page
        .locator("body")
        .evaluate(
          (node) => node.scrollWidth - document.documentElement.clientWidth,
        ),
    ).toBeLessThanOrEqual(1);
    await expect(page.locator("iframe")).toHaveCount(0);
    expect(await page.content()).not.toContain(
      "listing-browser-secret-sentinel",
    );
    await page.screenshot({
      path: info.outputPath(`hallwyl-${viewport.name}.png`),
      fullPage: true,
      style: "nextjs-portal{display:none!important}",
    });
  });
}
