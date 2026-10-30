import { requireDemoApi } from "@/lib/demo-auth";
import { parentOriginFromRequest } from "@/lib/archwalk/env";
import { PartnerApiError, publicErrorMessage } from "@/lib/archwalk/errors";
import { creatorIframeSrc } from "@/lib/archwalk/protocol";
import {
  createMuseumClient,
  resolveMuseumExperience,
} from "@/lib/archwalk/museum.server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

function sessionJson(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
) {
  return Response.json(body, {
    status: init.status,
    headers: { ...NO_STORE, ...init.headers },
  });
}

export async function POST(request: Request) {
  const denied = requireDemoApi(request);
  if (denied) return denied;
  const client = createMuseumClient();
  if (!client.config.configured) {
    return sessionJson(
      {
        error: "ArchWalk 360 is not configured.",
        missing: client.config.missing,
      },
      { status: 503 },
    );
  }

  try {
    const origin = parentOriginFromRequest(request);
    const experience = await resolveMuseumExperience(client);
    const session = await client.mintCreatorSession(
      origin,
      experience.experience_id,
    );

    return sessionJson({
      sessionApiId: session.api_id,
      token: session.token,
      creatorOrigin: client.config.appOrigin,
      creatorUrl: creatorIframeSrc(client.config.appOrigin, session.api_id),
      publicationStatus: experience.publication_status,
      publicId: experience.public_id,
    });
  } catch (error) {
    if (error instanceof PartnerApiError) {
      const status =
        error.status === 401 || error.status === 403 ? 503 : error.status;
      return sessionJson(
        {
          error:
            error.code === "hallwyl_connection_mismatch"
              ? error.message
              : publicErrorMessage(error),
          code: error.code,
          retryAfterSeconds: error.retryAfterSeconds,
        },
        {
          status,
          headers:
            error.retryAfterSeconds !== null
              ? { "Retry-After": String(Math.ceil(error.retryAfterSeconds)) }
              : undefined,
        },
      );
    }

    return sessionJson(
      { error: "ArchWalk 360 could not be reached." },
      { status: 503 },
    );
  }
}
