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

const response = (items: unknown[]) => Response.json({ items });

function mapping(resource: string, customer = "zesora_concept_demo") {
  return {
    experience_id: `exp_${resource}`, public_id: `pub_${resource}`,
    name: resource, external_resource_id: resource,
    external_customer_id: customer, lifecycle_status: "active",
    publication_status: "unpublished", draft_revision: 1,
  };
}

describe("plugin read-only inventory", () => {
  it("looks up each variant without creating Experiences when dashboard loads", async () => {
    const requests: Array<{method: string; url: string}> = [];
    const client = createPartnerClient({ env, fetch: async (input, init) => {
      const url = String(input);
      requests.push({ method: init?.method || "GET", url });
      const resource = new URL(url).searchParams.get("external_resource_id") || "";
      return response(resource === "room_type_deluxe_king" ? [mapping(resource)] : []);
    }});
    const inventory = buildPluginInventory();
    const first = await syncPluginInventory(client, inventory);
    assert.equal(first.lookup_calls, 9);
    assert.equal(first.synced, 1);
    assert.equal(first.failed, 0);
    assert.equal(first.variants[0].status, "Draft");
    assert.equal(first.variants[1].status, "Not configured");
    assert.equal(requests.length, 9);
    assert.ok(requests.every(r => r.method === "GET"));
    const second = await syncPluginInventory(client, inventory);
    assert.equal(second.lookup_calls, 9);
    assert.equal(requests.length, 18);
    assert.ok(requests.every(r => !r.url.includes("AW360_API_KEY")));
  });

  it("preserves non-failing results when one lookup throws", async () => {
    const client = createPartnerClient({ env, fetch: async input => {
      const resource = new URL(String(input)).searchParams.get("external_resource_id");
      if (resource === "room_type_deluxe_twin") throw new Error("unavailable");
      return response(resource === "room_type_deluxe_king" ? [mapping(resource)] : []);
    }});
    const result = await syncPluginInventory(client, buildPluginInventory());
    assert.equal(result.synced, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.variants.find(r => r.id === "deluxe_twin")?.status, "Needs attention");
  });

  it("does not treat API failures as process crashes", async () => {
    const client = createPartnerClient({ env, fetch: async () => {
      throw new PartnerApiError({status: 502, message: "Temporary failure"});
    }});
    const result = await syncPluginInventory(client, buildPluginInventory());
    assert.equal(result.synced, 0);
    assert.equal(result.failed, 9);
  });
});
