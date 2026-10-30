import { createDemoSession, demoCookieName } from "../demo-auth";
import assert from "node:assert/strict";
import { it } from "node:test";
import { POST } from "../../app/api/archwalk/creator-session/route";
import { HALLWYL_EXPERIENCE_ID, HALLWYL_PUBLIC_ID } from "./museum.server";
const config = {
  DEMO_ACCESS_PASSWORD: "unit-test-password-only",
  DEMO_SESSION_SECRET: "unit-test-signing-secret-with-at-least-32-chars",
  ARCHWALK_API_BASE: "https://blue.example",
  ARCHWALK_APP_ORIGIN: "https://blue-app.example",
  AW360_API_KEY: "test-blue-secret",
  HALLWYL_API_BASE: "https://api.archwalk.example",
  HALLWYL_APP_ORIGIN: "https://app.archwalk.example",
  HALLWYL_API_KEY: "test-museum-secret",
  APP_ORIGIN: "https://reference.example",
  HALLWYL_ITEM_ID: "sunset-villa-001",
};
for (const state of [
  "connected",
  "missing",
  "wrong-experience",
  "wrong-public",
]) {
  it(`Hallwyl Creator ${state}: resolve existing only; never create a replacement`, async () => {
    const prior = { ...process.env };
    const original = globalThis.fetch;
    Object.assign(process.env, config);
    delete process.env.HALLWYL_CUSTOMER_ID;
    const calls: Array<{ method: string; url: string; body: unknown }> = [];
    globalThis.fetch = async (input, init) => {
      const url = String(input),
        method = init?.method ?? "GET";
      assert.ok(url.startsWith(config.HALLWYL_API_BASE));
      assert.equal(
        new Headers(init?.headers).get("Authorization"),
        `Bearer ${config.HALLWYL_API_KEY}`,
      );
      calls.push({
        method,
        url,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      if (url.includes("/experiences?")) {
        assert.match(url, /external_resource_id=sunset-villa-001/);
        return Response.json({
          items:
            state === "missing"
              ? []
              : [
                  {
                    experience_id:
                      state === "wrong-experience"
                        ? "other"
                        : HALLWYL_EXPERIENCE_ID,
                    public_id:
                      state === "wrong-public" ? "other" : HALLWYL_PUBLIC_ID,
                    publication_status: "published",
                  },
                ],
        });
      }
      assert.ok(url.endsWith("/creator-sessions"));
      return Response.json({
        api_id: "session",
        token: "short-lived-token",
        origin: config.APP_ORIGIN,
        status: "active",
        permitted_actions: [],
      });
    };
    try {
      const response = await POST(
        new Request(config.APP_ORIGIN + "/api/archwalk/creator-session", {
          method: "POST",
          headers: {
            origin: config.APP_ORIGIN,
            cookie: `${demoCookieName()}=${createDemoSession()}`,
          },
        }),
      );
      const body = await response.json();
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(calls[0].method, "GET");
      assert.equal(
        calls.some(
          (x) => x.method === "POST" && x.url.endsWith("/experiences"),
        ),
        false,
      );
      if (state === "connected") {
        assert.equal(response.status, 200);
        assert.equal(
          (calls[1].body as { experience_id: string }).experience_id,
          HALLWYL_EXPERIENCE_ID,
        );
        assert.equal(body.publicId, HALLWYL_PUBLIC_ID);
        assert.equal(process.env.AW360_API_KEY, config.AW360_API_KEY);
        assert.equal(body.creatorOrigin, config.HALLWYL_APP_ORIGIN);
        assert.ok(!body.creatorUrl.includes(body.token));
        assert.ok(!JSON.stringify(body).includes(config.AW360_API_KEY));
      } else {
        assert.equal(response.status, 409);
        assert.equal(calls.length, 1);
        assert.match(body.error, /No Experience was created/);
      }
    } finally {
      globalThis.fetch = original;
      for (const key of Object.keys(process.env))
        if (!(key in prior)) delete process.env[key];
      Object.assign(process.env, prior);
    }
  });
}
