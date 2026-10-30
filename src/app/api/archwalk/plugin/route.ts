import { requireDemoApi } from "@/lib/demo-auth";
import { createPartnerClient } from "@/lib/archwalk/client";
import { PartnerApiError, publicErrorMessage } from "@/lib/archwalk/errors";
import { buildPluginInventory } from "@/lib/plugin/inventory";
import {
  syncPluginInventory,
  unsyncedPluginInventory,
} from "@/lib/plugin/sync";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  const denied = requireDemoApi(request);
  if (denied) return denied;
  const inventory = buildPluginInventory();
  const client = createPartnerClient();
  if (!client.config.configured) {
    return json({
      configured: false,
      missing: client.config.missing,
      ...unsyncedPluginInventory(inventory),
    });
  }

  try {
    const result = await syncPluginInventory(client, inventory);
    return json({
      configured: true,
      appOrigin: client.config.appOrigin,
      resort: result.resort,
      physical_room_count: result.physical_room_count,
      visual_variant_count: result.visual_variant_count,
      synced: result.synced,
      failed: result.failed,
      variants: result.variants,
    });
  } catch (error) {
    if (error instanceof PartnerApiError) {
      return json(
        {
          configured: true,
          error: publicErrorMessage(error),
          ...unsyncedPluginInventory(inventory),
        },
        error.status === 401 || error.status === 403 ? 503 : error.status,
      );
    }
    return json(
      {
        configured: true,
        error: "ArchWalk 360 could not be reached.",
        ...unsyncedPluginInventory(inventory),
      },
      503,
    );
  }
}
