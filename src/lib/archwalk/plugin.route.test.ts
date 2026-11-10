import { createDemoSession, demoCookieName } from "../demo-auth";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { POST } from "../../app/api/archwalk/plugin/route";
import { POST as mintPluginSession } from "../../app/api/archwalk/plugin/creator-session/route";
import { POST as getPublication } from "../../app/api/archwalk/plugin/publication/route";

function authHeaders() {
  return {
    origin: "http://localhost:3001",
    cookie: `${demoCookieName()}=${createDemoSession()}`,
  };
}
const env = {
  DEMO_ACCESS_PASSWORD: "unit-test-password-only",
  DEMO_SESSION_SECRET: "unit-test-signing-secret-with-at-least-32-chars",
  ARCHWALK_API_BASE: "https://api.archwalk.example",
  ARCHWALK_APP_ORIGIN: "https://app.archwalk.example",
  AW360_API_KEY: "aw360_sk_cred.testsecret",
  APP_ORIGIN: "http://localhost:3001",
};

function assignEnv() {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  Object.assign(process.env, env);
  return () => {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  };
}

describe("plugin Partner routes", () => {
  it("lists nine concept variants without creating a production Experience", async () => {
    const restore = assignEnv();
    const calls: unknown[] = [];
    globalThis.fetch = (async (_input, init) => {
      assert.equal(init?.method, "GET");
      const url = new URL(String(_input));
      calls.push(url.toString());
      assert.equal(url.searchParams.get("external_customer_id"), "zesora_concept_demo");
      return Response.json({ items: [] });
    }) as typeof fetch;

    try {
      const response = await POST(
        new Request("http://localhost:3001/api/archwalk/plugin", {
          method: "POST",
          headers: authHeaders(),
        }),
      );
      const body = (await response.json()) as {
        physical_room_count: number;
        visual_variant_count: number;
        variants: Array<{ id: string }>;
        create_or_resolve_calls?: number;
        failed: number;
      };
      assert.equal(response.status, 200);
      assert.equal(body.physical_room_count, 18);
      assert.equal(body.visual_variant_count, 9);
      assert.equal(body.variants.length, 9);
      assert.equal(calls.length, 9);
      assert.equal(body.create_or_resolve_calls, undefined);
      assert.equal(body.failed, 0);
      assert.equal(JSON.stringify(body).includes("aw360_sk_"), false);
      assert.equal(JSON.stringify(body).includes("AW360_API_KEY"), false);
    } finally {
      restore();
    }
  });

  it("mints a Creator session for one variant without putting the token in the iframe URL", async () => {
    const restore = assignEnv();
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      if (url.endsWith("/api/v1/360/experiences")) {
        return Response.json({
          experience_id: "exp_deluxe",
          public_id: "pub_deluxe",
          name: body.name,
          external_resource_id: body.external_resource_id,
          lifecycle_status: "active",
          publication_status: "unpublished",
          draft_revision: 1,
        });
      }
      if (url.endsWith("/api/v1/360/creator-sessions")) {
        return Response.json(
          {
            api_id: "sess_plugin",
            token: "aw360_cs_sess_plugin.secret",
            origin: "http://localhost:3001",
            permitted_actions: [],
            status: "active",
          },
          { status: 201 },
        );
      }
      throw new Error(url);
    }) as typeof fetch;

    try {
      const response = await mintPluginSession(
        new Request(
          "http://localhost:3001/api/archwalk/plugin/creator-session",
          {
            method: "POST",
            headers: { ...authHeaders(), "content-type": "application/json" },
            body: JSON.stringify({ variantId: "deluxe_king" }),
          },
        ),
      );
      const body = (await response.json()) as {
        creatorUrl: string;
        token: string;
        experienceId: string;
      };
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      assert.equal(
        body.creatorUrl,
        "https://app.archwalk.example/aw360/c/sess_plugin",
      );
      assert.equal(body.creatorUrl.includes(body.token), false);
      assert.equal(body.experienceId, "exp_deluxe");
      assert.equal(JSON.stringify(body).includes("aw360_sk_"), false);
    } finally {
      restore();
    }
  });

  it("rejects a Creator host mistakenly configured to this demo origin", async () => {
    const restore = assignEnv();
    process.env.ARCHWALK_APP_ORIGIN = "http://localhost:3001";
    let called = false;
    globalThis.fetch = (async () => { called = true; throw new Error("Should not call API"); }) as typeof fetch;
    try {
      const response = await mintPluginSession(new Request(
        "http://localhost:3001/api/archwalk/plugin/creator-session", {
          method: "POST",
          headers: { ...authHeaders(), "content-type": "application/json" },
          body: JSON.stringify({ variantId: "deluxe_king" }),
        },
      ));
      const body = await response.json();
      assert.equal(response.status, 503);
      assert.match(body.error, /ARCHWALK_APP_ORIGIN/);
      assert.equal(called, false);
    } finally { restore(); }
  });

  it("reuses one Experience/public_id for rooms 101 and 102", async () => {
    const restore = assignEnv();
    globalThis.fetch = (async (_input, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      return Response.json({
        experience_id: "exp_deluxe",
        public_id: "pub_deluxe",
        name: body.name,
        external_resource_id: body.external_resource_id,
        lifecycle_status: "active",
        publication_status: "published",
        draft_revision: 4,
      });
    }) as typeof fetch;

    try {
      const first = await getPublication(
        new Request(
          "http://localhost:3001/api/archwalk/plugin/publication?room=101",
          { method: "POST", headers: authHeaders() },
        ),
      );
      const second = await getPublication(
        new Request(
          "http://localhost:3001/api/archwalk/plugin/publication?room=102",
          { method: "POST", headers: authHeaders() },
        ),
      );
      const a = (await first.json()) as {
        public_id: string;
        embed_url: string;
        variant_id: string;
      };
      const b = (await second.json()) as {
        public_id: string;
        embed_url: string;
        variant_id: string;
      };
      assert.equal(a.variant_id, "deluxe_king");
      assert.equal(b.variant_id, "deluxe_king");
      assert.equal(a.public_id, "pub_deluxe");
      assert.equal(b.public_id, a.public_id);
      assert.equal(a.embed_url, b.embed_url);
      assert.match(a.embed_url, /\/aw360\/v\/pub_deluxe$/);
    } finally {
      restore();
    }
  });
});
