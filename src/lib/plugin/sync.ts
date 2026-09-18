import { createPartnerClient, type PartnerExperience } from "@/lib/archwalk/client";
import { PartnerApiError, publicErrorMessage } from "@/lib/archwalk/errors";
import {
  buildPluginInventory,
  derivePluginStatus,
  type PluginInventory,
  type PluginStatus,
  type PluginVariant,
} from "./inventory";

export type PluginVariantRow = {
  id: string;
  name: string;
  room_count: number;
  sample_rooms: string[];
  external_customer_id: string;
  external_resource_id: string;
  experience_id: string | null;
  public_id: string | null;
  publication_status: "unpublished" | "published" | null;
  status: PluginStatus;
  ok: boolean;
  message: string | null;
};

export type PluginSyncResult = {
  resort: PluginInventory["resort"];
  physical_room_count: number;
  visual_variant_count: number;
  synced: number;
  failed: number;
  create_or_resolve_calls: number;
  variants: PluginVariantRow[];
};

function toRow(
  variant: PluginVariant,
  mapping: PartnerExperience | null,
  failed: boolean,
  message: string | null,
): PluginVariantRow {
  const published = mapping?.publication_status === "published";
  return {
    id: variant.id,
    name: variant.name,
    room_count: variant.room_count,
    sample_rooms: variant.room_numbers.slice(0, 3),
    external_customer_id: variant.external_customer_id,
    external_resource_id: variant.external_resource_id,
    experience_id: mapping?.experience_id ?? null,
    public_id: published ? mapping?.public_id ?? null : null,
    publication_status: mapping?.publication_status ?? null,
    status: derivePluginStatus({ mapping, failed }),
    ok: Boolean(mapping) && !failed,
    message,
  };
}

export async function syncPluginInventory(
  client: ReturnType<typeof createPartnerClient>,
  inventory: PluginInventory = buildPluginInventory(),
): Promise<PluginSyncResult> {
  const rows: PluginVariantRow[] = [];
  let calls = 0;

  for (const variant of inventory.variants) {
    calls += 1;
    try {
      const experience = await client.createOrResolveExperience({
        name: variant.name,
        external_resource_id: variant.external_resource_id,
        external_customer_id: variant.external_customer_id,
      });
      rows.push(toRow(variant, experience, false, null));
    } catch (error) {
      const message =
        error instanceof PartnerApiError
          ? publicErrorMessage(error)
          : "This room type could not be synced.";
      rows.push(toRow(variant, null, true, message));
    }
  }

  return {
    resort: inventory.resort,
    physical_room_count: inventory.physical_room_count,
    visual_variant_count: inventory.visual_variant_count,
    synced: rows.filter((row) => row.ok).length,
    failed: rows.filter((row) => !row.ok).length,
    create_or_resolve_calls: calls,
    variants: rows,
  };
}

export function unsyncedPluginInventory(
  inventory: PluginInventory = buildPluginInventory(),
): PluginSyncResult {
  return {
    resort: inventory.resort,
    physical_room_count: inventory.physical_room_count,
    visual_variant_count: inventory.visual_variant_count,
    synced: 0,
    failed: 0,
    create_or_resolve_calls: 0,
    variants: inventory.variants.map((variant) =>
      toRow(variant, null, false, null),
    ),
  };
}
