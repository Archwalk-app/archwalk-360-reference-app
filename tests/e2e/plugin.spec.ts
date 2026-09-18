import { expect, test } from "@playwright/test";

test("plugin dashboard maps 200 rooms to 8 variants without leaking the API key", async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() === "script") {
      scripts.push(await response.text());
    }
  });
  await page.goto("/plugin");
  await expect(page.getByRole("heading", { name: "Blue Lagoon Resort" })).toBeVisible();
  await expect(page.getByText("200 rooms imported")).toBeVisible();
  await expect(page.getByText("8 visual variants")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit 360" })).toHaveCount(8);
  await expect(page.getByRole("link", { name: "101" })).toBeVisible();
  await expect(page.getByRole("link", { name: "102" })).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain("listing-browser-secret-sentinel");
  expect(html).not.toMatch(/aw360_sk_/);
  expect(scripts.join("\n")).not.toContain("listing-browser-secret-sentinel");
});

test("Edit 360 uses the Creator handshake and publish updates Deluxe King", async ({
  page,
}) => {
  await page.goto("/plugin");
  await page.getByRole("button", { name: "Edit 360" }).first().click();
  const iframe = page.locator("iframe[title='ArchWalk 360 Creator']");
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute("src", /\/aw360\/c\/sess_room_type_deluxe_king$/);
  await expect(iframe).not.toHaveAttribute("src", /aw360_cs_|token=/);
  await expect
    .poll(async () => page.locator("table tbody tr").first().textContent())
    .toMatch(/Draft|Published/);
  await page.frameLocator("iframe[title='ArchWalk 360 Creator']").getByRole("button", {
    name: "Publish demo",
  }).click();
  await expect(page.locator("table tbody tr").first()).toContainText("Published");
  await expect(page.getByRole("link", { name: "View 360" }).first()).toBeVisible();
});

test("rooms 101 and 102 share the Deluxe King Viewer after publish", async ({
  page,
}) => {
  await page.goto("/plugin");
  await page.getByRole("button", { name: "Edit 360" }).first().click();
  await page.frameLocator("iframe[title='ArchWalk 360 Creator']").getByRole("button", {
    name: "Publish demo",
  }).click();
  await expect(page.locator("table tbody tr").first()).toContainText("Published");

  await page.goto("/plugin/rooms/101");
  const first = page.locator("iframe[title='ArchWalk 360 Viewer']");
  await expect(first).toBeVisible();
  const firstSrc = await first.getAttribute("src");
  expect(firstSrc).toMatch(/\/aw360\/v\//);

  await page.goto("/plugin/rooms/102");
  const second = page.locator("iframe[title='ArchWalk 360 Viewer']");
  await expect(second).toBeVisible();
  expect(await second.getAttribute("src")).toBe(firstSrc);
});

test("unconfigured host still shows imported inventory", async ({ page }) => {
  await page.goto("http://127.0.0.1:3003/plugin");
  await expect(page.getByRole("heading", { name: "Blue Lagoon Resort" })).toBeVisible();
  await expect(page.getByText("200 rooms imported")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit 360" })).toHaveCount(8);
  await expect(page.locator("iframe")).toHaveCount(0);
});
