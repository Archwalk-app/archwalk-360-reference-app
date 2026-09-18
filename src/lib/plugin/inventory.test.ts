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
  it("collapses 200 physical rooms into 8 visual variants", () => {
    const inventory = buildPluginInventory();
    assert.equal(inventory.physical_room_count, 200);
    assert.equal(inventory.visual_variant_count, 8);
    assert.equal(inventory.rooms.length, 200);
    assert.equal(inventory.variants.length, 8);
    assert.equal(
      PLUGIN_VARIANT_SPECS.reduce((sum, spec) => sum + spec.roomCount, 0),
      200,
    );
    assert.ok(inventory.visual_variant_count < inventory.physical_room_count);
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

  it("maps rooms 101 and 102 to Deluxe King", () => {
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
