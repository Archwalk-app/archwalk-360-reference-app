import { createPartnerClient } from "@/lib/archwalk/client";
import { PartnerApiError, publicErrorMessage } from "@/lib/archwalk/errors";
import { viewerIframeSrc } from "@/lib/archwalk/protocol";
import { buildPluginInventory, findPluginRoom } from "@/lib/plugin/inventory";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomNumber = url.searchParams.get("room") ?? "";
  const inventory = buildPluginInventory();
  const found = findPluginRoom(inventory, roomNumber);
  if (!found) {
    return json({ error: "Unknown room." }, 404);
  }

  const client = createPartnerClient();
  if (!client.config.configured) {
    return json({
      room_number: found.room.room_number,
      variant_id: found.variant.id,
      variant_name: found.variant.name,
      publication_status: "unpublished",
      public_id: null,
      embed_url: null,
    });
  }

  try {
    const experience = await client.createOrResolveExperience({
      name: found.variant.name,
      external_resource_id: found.variant.external_resource_id,
      external_customer_id: found.variant.external_customer_id,
    });
    const published = experience.publication_status === "published";
    return json({
      room_number: found.room.room_number,
      variant_id: found.variant.id,
      variant_name: found.variant.name,
      experience_id: experience.experience_id,
      publication_status: experience.publication_status,
      public_id: published ? experience.public_id : null,
      embed_url: published
        ? viewerIframeSrc(client.config.appOrigin, experience.public_id)
        : null,
    });
  } catch (error) {
    if (error instanceof PartnerApiError) {
      return json(
        { error: publicErrorMessage(error) },
        error.status === 401 || error.status === 403 ? 503 : error.status,
      );
    }
    return json({ error: "ArchWalk 360 could not be reached." }, 503);
  }
}
