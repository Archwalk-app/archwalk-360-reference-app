import { createPartnerClient } from "@/lib/archwalk/client";
import { parentOriginFromRequest } from "@/lib/archwalk/env";
import { PartnerApiError, publicErrorMessage } from "@/lib/archwalk/errors";
import { creatorIframeSrc } from "@/lib/archwalk/protocol";
import { buildPluginInventory } from "@/lib/plugin/inventory";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export async function POST(request: Request) {
  const client = createPartnerClient();
  if (!client.config.configured) {
    return json(
      {
        error: "ArchWalk 360 is not configured.",
        missing: client.config.missing,
      },
      503,
    );
  }

  let variantId = "";
  try {
    const body = (await request.json()) as { variantId?: unknown };
    variantId = typeof body.variantId === "string" ? body.variantId : "";
  } catch {
    return json({ error: "Choose a room type to edit." }, 400);
  }

  const variant = buildPluginInventory().variants.find(
    (item) => item.id === variantId,
  );
  if (!variant) {
    return json({ error: "Unknown room type." }, 404);
  }

  try {
    const origin = parentOriginFromRequest(request);
    const experience = await client.createOrResolveExperience({
      name: variant.name,
      external_resource_id: variant.external_resource_id,
      external_customer_id: variant.external_customer_id,
    });
    const session = await client.mintCreatorSession(
      origin,
      experience.experience_id,
    );

    return json({
      variantId: variant.id,
      sessionApiId: session.api_id,
      token: session.token,
      creatorOrigin: client.config.appOrigin,
      creatorUrl: creatorIframeSrc(client.config.appOrigin, session.api_id),
      publicationStatus: experience.publication_status,
      publicId: experience.public_id,
      experienceId: experience.experience_id,
    });
  } catch (error) {
    if (error instanceof PartnerApiError) {
      const status =
        error.status === 401 || error.status === 403 ? 503 : error.status;
      return json(
        {
          error: publicErrorMessage(error),
          code: error.code,
        },
        status,
      );
    }
    return json({ error: "ArchWalk 360 could not be reached." }, 503);
  }
}
