import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
test("gallery invitation, keyboard switch, cleanup and intentional deep link", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.goto("/viewer");
  const photos = page.locator(".museum-photo-choice"),
    tour = page.locator(".museum-tour-action");
  await expect(photos).toHaveAttribute("aria-selected", "true");
  await expect(tour).toHaveAttribute("aria-selected", "false");
  await expect(page.locator(".museum-tour-invitation")).toHaveCount(0);
  await tour.hover();
  await expect(tour).toHaveCSS("background-color", "rgba(65, 75, 41, 0.035)");
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator("#listing-media img")).toHaveCount(5);
  await page
    .getByRole("button", { name: "View Morning Room photograph" })
    .click();
  const before = (await page.locator("#listing-media").boundingBox())!;
  await page.evaluate(() =>
    Object.assign(window, { discoveryVisit: "same-document" }),
  );
  await photos.focus();
  await page.keyboard.press("ArrowRight");
  await expect(tour).toBeFocused();
  await expect(photos).toHaveAttribute("aria-selected", "true");
  await expect(tour).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("http://127.0.0.1:3002/viewer");
  expect(await page.evaluate(() => Reflect.get(window, "discoveryVisit"))).toBe(
    "same-document",
  );
  const frame = page.locator("iframe");
  await expect(frame).toHaveAttribute("allow", "fullscreen");
  await expect(frame).toHaveAttribute(
    "src",
    "http://127.0.0.1:3216/aw360/v/1e00029c-d4ff-4a22-8d5b-c95d10ae3f57",
  );
  expect((await frame.boundingBox())!.height).toBeGreaterThan(
    before.height + 120,
  );
  await expect(tour).toBeFocused();
  await expect(tour).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".museum-tour-instructions")).toBeVisible();
  const handle = await frame.elementHandle();
  await page.getByRole("button", { name: "Dismiss tour instructions" }).click();
  expect(await handle!.evaluate((node) => node.isConnected)).toBe(true);
  await page.getByRole("tab", { name: "Photos", exact: true }).click();
  await expect(frame).toHaveCount(0);
  expect(await handle!.evaluate((node) => node.isConnected)).toBe(false);
  await expect(page.locator(".museum-feature-photo img")).toHaveAttribute(
    "alt",
    /Morning Room/,
  );
  await expect(photos).toBeFocused();
  await page.keyboard.press("End");
  await expect(tour).toBeFocused();
  await page.keyboard.press("Home");
  await expect(photos).toBeFocused();
  await tour.focus();
  await page.keyboard.press("Space");
  await expect(frame).toHaveCount(1);
  await expect(page.locator(".museum-tour-instructions")).toHaveCount(0);
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  await photos.click();
  await page.goto("/viewer?tour=1#museum-media");
  await expect(page).toHaveURL(/tour=1#museum-media/);
  await expect(frame).toHaveCount(1);
  await expect(page.locator(".museum-tour-instructions")).toHaveCount(0);
});
for (const viewport of [
  { name: "desktop", width: 1440, height: 1080 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(
    "Hallwyl " + viewport.name + " Photos and immersive Tour visual check",
    async ({ page }, info) => {
      test.setTimeout(90000);
      await page.setViewportSize(viewport);
      // Serve this local public preview at the already-allowlisted demo origin.
      // The production Viewer's CSP, origin checks and responses remain untouched.
      await page.route("https://demo.archwalk.app/**", async (route) => {
        const url = new URL(route.request().url());
        if (
          url.pathname != "/viewer" &&
          !url.pathname.startsWith("/_next/") &&
          !url.pathname.startsWith("/museum/") &&
          url.pathname != "/favicon.ico"
        ) {
          await route.abort();
          return;
        }
        const headers = { ...route.request().headers() };
        delete headers.host;
        delete headers.origin;
        delete headers.referer;
        const response = await route.fetch({
          url: "http://127.0.0.1:3003" + url.pathname + url.search,
          headers,
        });
        await route.fulfill({ response });
      });
      await page.goto("https://demo.archwalk.app/viewer");
      // Render the actual Gallery component in an isolated client harness.
      // This avoids Next's local-only HMR socket at the allowlisted virtual origin;
      // the first test exercises normal Next hydration and mode transitions.
      const { build } = createRequire(require.resolve("tsx/package.json"))(
        "esbuild",
      );
      const bundle = await build({
        stdin: {
          contents:
            "import {createRoot} from 'react-dom/client'; import {createElement} from 'react'; import {ListingMedia} from './src/app/viewer/listing-media'; const old=document.querySelector('#museum-media'); const mount=document.createElement('div'); old.replaceWith(mount); createRoot(mount).render(createElement(ListingMedia,{embedUrl:'https://archwalk.app/aw360/v/1e00029c-d4ff-4a22-8d5b-c95d10ae3f57'}));",
          resolveDir: process.cwd(),
          loader: "tsx",
        },
        bundle: true,
        platform: "browser",
        write: false,
        minify: true,
        jsx: "automatic",
        define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
      });
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      await expect(
        page.getByRole("heading", {
          name: "Explore the rooms. Then step inside.",
        }),
      ).toBeVisible();
      await expect(page.locator("iframe")).toHaveCount(0);
      await expect(
        page.getByRole("tab", { name: "Photos", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await expect
        .poll(() =>
          page
            .locator(".museum-feature-photo img")
            .evaluate((i) => (i as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
      const action = page.getByRole("tab", { name: "Interactive 360° Tour" });
      await expect(action).toBeInViewport();
      await expect(action).toHaveAttribute("aria-selected", "false");
      const toolbar = await page.locator(".museum-media-toolbar").boundingBox(),
        photo = await page.locator(".museum-feature-photo").boundingBox();
      expect(toolbar!.y).toBeGreaterThanOrEqual(0);
      expect(photo!.y).toBeGreaterThan(toolbar!.y + toolbar!.height);
      expect(photo!.y).toBeLessThan(viewport.height - 120);
      expect(
        await action.evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
      ).toBeGreaterThanOrEqual(15);
      await expect(page.locator(".museum-media-explanation")).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Explore in 360°" }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("tab", { name: "Photos", exact: true }),
      ).toHaveCSS("border-bottom-color", "rgb(102, 110, 56)");
      await page.screenshot({
        path: info.outputPath("hallwyl-" + viewport.name + "-photos.png"),
        style: "nextjs-portal{display:none!important}",
      });
      await page.getByRole("tab", { name: "Interactive 360° Tour" }).click();
      const viewer = page.frameLocator("iframe");
      await expect(viewer.locator("canvas").first()).toBeVisible({
        timeout: 60000,
      });
      await expect(viewer.getByTestId("aw360-panorama-transition")).toBeHidden({
        timeout: 60000,
      });
      await expect(page.locator(".museum-tour-instructions")).toBeVisible();
      await expect(
        page.getByRole("tab", { name: "Photos", exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
      const frame = await page.locator("iframe").boundingBox();
      expect(frame!.height).toBeGreaterThan(viewport.height * 0.7);
      expect(frame!.y).toBeGreaterThanOrEqual(0);
      expect(frame!.y + frame!.height).toBeLessThanOrEqual(viewport.height + 4);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.locator(".museum-media-workspace").screenshot({
        path: info.outputPath("hallwyl-" + viewport.name + "-tour.png"),
        style: "nextjs-portal{display:none!important}",
      });
    },
  );
}
