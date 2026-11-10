import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PLUGIN_VARIANT_SPECS,
  buildPluginInventory,
  derivePluginStatus,
  findPluginRoom,
  pluginExternalResourceId,
} from "./inventory";

describe("plugin inventory", () => {
  it("models 18 clearly fictional sample room IDs across 9 variants", () => {
    const inventory = buildPluginInventory();
    assert.equal(inventory.physical_room_count, 18);
    assert.equal(inventory.visual_variant_count, 9);
    assert.equal(inventory.rooms.length, 18);
    assert.equal(inventory.variants.length, 9);
    assert.equal(
      PLUGIN_VARIANT_SPECS.reduce((sum, spec) => sum + spec.roomCount, 0),
      18,
    );
    assert.ok(inventory.visual_variant_count < inventory.physical_room_count);
    assert.equal(inventory.resort.external_customer_id, "zesora_concept_demo");
    assert.equal(inventory.variants[0].name, "Deluxe King Valley");
    for (const room of inventory.rooms) {
      assert.equal(
        inventory.variants.some((variant) => variant.id === room.variant_id),
        true,
      );
    }
    assert.deepEqual(
      inventory.variants.map((item) => item.external_resource_id),
      PLUGIN_VARIANT_SPECS.map((spec) => pluginExternalResourceId(spec.id)),
    );
    assert.deepEqual(buildPluginInventory().rooms, inventory.rooms);
  });

  it("maps fictional rooms 101 and 102 to Deluxe King Valley", () => {
    const inventory = buildPluginInventory();
    const first = findPluginRoom(inventory, "101");
    const second = findPluginRoom(inventory, "102");
    assert.equal(first?.variant.id, "deluxe_king");
    assert.equal(second?.variant.id, "deluxe_king");
    assert.equal(
      first?.variant.external_resource_id,
      "room_type_deluxe_king",
    );
    assert.equal(
      first?.variant.external_resource_id,
      second?.variant.external_resource_id,
    );
    assert.equal(derivePluginStatus({ mapping: null }), "Not configured");
    assert.equal(
      derivePluginStatus({ mapping: { publication_status: "unpublished" } }),
      "Draft",
    );
    assert.equal(
      derivePluginStatus({ mapping: { publication_status: "published" } }),
      "Published",
    );
    assert.equal(
      derivePluginStatus({
        mapping: { publication_status: "published" },
        failed: true,
      }),
      "Needs attention",
    );
  });
});
