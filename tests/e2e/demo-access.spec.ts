import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:3002";
const metrics = async (request: import("@playwright/test").APIRequestContext) =>
  (await (await request.get("http://127.0.0.1:3216/fixture-metrics")).json())
    .partnerCalls;
test("public exhibition remains open; unauthenticated pages and direct APIs cannot call Partner", async ({
  page,
  request,
}) => {
  const before = await metrics(request);
  for (const path of ["/editor", "/plugin", "/plugin/rooms/101"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/demo-login?returnTo=");
  }
  for (const path of [
    "/api/archwalk/creator-session",
    "/api/archwalk/plugin",
    "/api/archwalk/plugin/creator-session",
    "/api/archwalk/plugin/publication?room=101",
  ]) {
    for (const method of ["GET", "POST"]) {
      const response = await request.fetch(path, {
        method,
        headers: { Origin: origin },
      });
      expect(response.status()).toBe(401);
      expect(await response.text()).not.toContain("missing");
    }
  }
  expect(await metrics(request)).toBe(before);
  await page.goto("/viewer");
  await expect(
    page.getByRole("heading", { name: "Hallwyl Museum." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Hotel demo" })).toBeVisible();
  await page.goto("/viewer/credits");
  await expect(
    page.getByRole("heading", { name: "Credit where it belongs." }),
  ).toBeVisible();
});
test("one password unlocks both Creators, preserves rooms, rejects CSRF and logs out", async ({
  page,
  request,
}) => {
  await page.goto("/plugin/rooms/101");
  await expect(page).toHaveURL(/demo-login.*returnTo=/);
  await page.getByLabel("Demo password").fill("incorrect");
  await page.getByRole("button", { name: "Show", exact: true }).click();
  await expect(page.getByLabel("Demo password")).toHaveAttribute(
    "type",
    "text",
  );
  await page.getByRole("button", { name: "Hide", exact: true }).click();
  await page.getByRole("button", { name: "Unlock demo", exact: true }).click();
  await expect(page.locator("#login-error")).toContainText("Unable to unlock");
  await page.getByLabel("Demo password").fill("demo-test-password-only");
  await page.getByRole("button", { name: "Unlock demo", exact: true }).click();
  await expect(page).toHaveURL(origin + "/plugin/rooms/101");
  await page.getByRole("link", { name: "Hotel demo", exact: true }).click();
  await expect(
    page.getByText("200 rooms imported", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit 360", exact: true }),
  ).toHaveCount(8);
  const before = await metrics(request);
  const csrf = await page.request.post("/api/archwalk/plugin", {
    headers: { Origin: "https://evil.example" },
  });
  expect(csrf.status()).toBe(403);
  expect(await metrics(request)).toBe(before);
  await page
    .getByRole("button", { name: "Edit 360", exact: true })
    .first()
    .click();
  const creator = page.frameLocator('iframe[title="ArchWalk 360 Creator"]');
  await expect(creator.getByText("Fixture Creator")).toBeVisible();
  await creator.getByRole("button", { name: "Publish demo" }).click();
  await expect(page.locator("table tbody tr").first()).toContainText(
    "Published",
  );
  await page.goto("/plugin/rooms/101");
  const room = page.locator('iframe[title="ArchWalk 360 Viewer"]');
  await expect(room).toBeVisible();
  const src = await room.getAttribute("src");
  await page.goto("/plugin/rooms/102");
  await expect(
    page.locator('iframe[title="ArchWalk 360 Viewer"]'),
  ).toHaveAttribute("src", src!);
  await page.getByRole("link", { name: "Museum editor", exact: true }).click();
  await expect(
    page
      .frameLocator('iframe[title="ArchWalk 360 Creator"]')
      .getByText("Fixture Creator"),
  ).toBeVisible();
  const scripts = await page
    .locator("script[src]")
    .evaluateAll((nodes) => nodes.map((n) => (n as HTMLScriptElement).src));
  for (const url of scripts) {
    const text = await (await request.get(url)).text();
    expect(text).not.toContain("demo-test-password-only");
    expect(text).not.toContain(
      "test-only-signing-secret-32-characters-minimum",
    );
  }
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(page).toHaveURL(origin + "/viewer");
  expect(
    (
      await page.request.post("/api/archwalk/creator-session", {
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/plugin");
  await expect(page).toHaveURL(/demo-login/);
});
