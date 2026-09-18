import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPartnerClient } from "../archwalk/client";
import { PartnerApiError } from "../archwalk/errors";
import { buildPluginInventory } from "./inventory";
import { syncPluginInventory } from "./sync";

const env = {
  ARCHWALK_API_BASE: "https://api.archwalk.example",
  AW360_API_KEY: "aw360_sk_cred.testsecret",
  ARCHWALK_APP_ORIGIN: "https://app.archwalk.example",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("plugin sync", () => {
  it("create-or-resolves once per visual variant, not per physical room", async () => {
    const calls: unknown[] = [];
    const store = new Map<string, { experience_id: string; public_id: string }>();
    const client = createPartnerClient({
      env,
      fetch: async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        calls.push(body);
        const key = `${body.external_customer_id}:${body.external_resource_id}`;
        const existing = store.get(key);
        if (existing) {
          return jsonResponse(200, {
            ...existing,
            name: body.name,
            external_resource_id: body.external_resource_id,
            lifecycle_status: "active",
            publication_status: "unpublished",
            draft_revision: 1,
          });
        }
        const created = {
          experience_id: `exp_${store.size + 1}`,
          public_id: `pub_${store.size + 1}`,
        };
        store.set(key, created);
        return jsonResponse(201, {
          ...created,
          name: body.name,
          external_resource_id: body.external_resource_id,
          lifecycle_status: "active",
          publication_status: "unpublished",
          draft_revision: 1,
        });
      },
    });

    const inventory = buildPluginInventory();
    const first = await syncPluginInventory(client, inventory);
    assert.equal(first.create_or_resolve_calls, 8);
    assert.equal(first.synced, 8);
    assert.equal(first.failed, 0);
    assert.equal(calls.length, 8);
    assert.notEqual(first.physical_room_count, first.create_or_resolve_calls);

    const deluxe = first.variants.find((row) => row.id === "deluxe_king");
    const second = await syncPluginInventory(client, inventory);
    assert.equal(second.create_or_resolve_calls, 8);
    assert.equal(store.size, 8);
    assert.equal(
      second.variants.find((row) => row.id === "deluxe_king")?.experience_id,
      deluxe?.experience_id,
    );
    assert.equal(
      (calls[0] as { external_resource_id: string }).external_resource_id,
      "room_type_deluxe_king",
    );
    assert.equal(
      (calls[0] as { external_customer_id: string }).external_customer_id,
      "blue_lagoon",
    );
  });

  it("keeps successful variants when one create-or-resolve fails", async () => {
    let calls = 0;
    const client = createPartnerClient({
      env,
      fetch: async (_input, init) => {
        const body = JSON.parse(String(init?.body));
        calls += 1;
        if (body.external_resource_id === "room_type_ocean_king") {
          throw Object.assign(new Error("fail"), { status: 502 });
        }
        return jsonResponse(201, {
          experience_id: `exp_${body.external_resource_id}`,
          public_id: `pub_${body.external_resource_id}`,
          name: body.name,
          external_resource_id: body.external_resource_id,
          lifecycle_status: "active",
          publication_status: "unpublished",
          draft_revision: 1,
        });
      },
    });

    const result = await syncPluginInventory(client, buildPluginInventory());
    assert.equal(result.synced, 7);
    assert.equal(result.failed, 1);
    assert.equal(
      result.variants.find((row) => row.id === "ocean_king")?.status,
      "Needs attention",
    );
    assert.equal(
      result.variants.find((row) => row.id === "deluxe_king")?.ok,
      true,
    );
    assert.equal(calls, 8);
  });

  it("does not treat a PartnerApiError as a process crash", async () => {
    const client = createPartnerClient({
      env,
      fetch: async () => {
        throw new PartnerApiError({
          status: 502,
          message: "Temporary failure",
        });
      },
    });
    const result = await syncPluginInventory(client, buildPluginInventory());
    assert.equal(result.synced, 0);
    assert.equal(result.failed, 8);
  });
});
