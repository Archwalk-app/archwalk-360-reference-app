import { property } from "@/lib/property";
import { getArchWalkConfig, type ArchWalkConfig } from "./env";
import {
  PartnerApiError,
  partnerErrorFromResponse,
  waitMsForRetry,
} from "./errors";

export const CREATOR_PERMITTED_ACTIONS = [
  "experiences:read",
  "experiences:write",
  "experiences:publish",
  "panoramas:read",
  "panoramas:write",
  "panoramas:upload",
] as const;

export type ExperienceIdentity = {
  name: string;
  external_resource_id: string;
  external_customer_id?: string;
};

export type PartnerExperience = {
  experience_id: string;
  public_id: string;
  name: string;
  external_resource_id: string;
  external_customer_id?: string | null;
  lifecycle_status: string;
  publication_status: "unpublished" | "published";
  draft_revision: number;
};

export type CreatorSessionResponse = {
  api_id: string;
  token: string;
  origin: string;
  permitted_actions: string[];
  status: string;
};

type FetchLike = typeof fetch;

export type PartnerClientOptions = {
  fetch?: FetchLike;
  sleep?: (ms: number) => Promise<void>;
  env?: Record<string, string | undefined>;
};

function configured(
  config: ArchWalkConfig,
): asserts config is Extract<ArchWalkConfig, { configured: true }> {
  if (!config.configured) {
    throw new PartnerApiError({
      status: 503,
      code: "archwalk_360_not_configured",
      message: `Missing ${config.missing.join(", ")}.`,
    });
  }
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function createPartnerClient(options: PartnerClientOptions = {}) {
  const fetchFn = options.fetch ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const config = getArchWalkConfig(options.env);

  async function request<T>(
    method: string,
    path: string,
    init: {
      body?: unknown;
      idempotent: boolean;
    },
  ): Promise<{ status: number; data: T }> {
    configured(config);

    const maxAttempts = init.idempotent ? 3 : 1;
    let attempt = 0;

    while (attempt < maxAttempts) {
      const response = await fetchFn(`${config.apiBase}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "application/json",
          ...(init.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
        cache: "no-store",
      });

      const text = await response.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text) as unknown;
        } catch {
          parsed = { detail: { message: text } };
        }
      }

      if (response.ok) {
        return { status: response.status, data: parsed as T };
      }

      const error = partnerErrorFromResponse(
        response.status,
        parsed,
        response.headers.get("Retry-After"),
      );

      const retryableStatus = response.status === 429 || response.status === 503;
      if (init.idempotent && retryableStatus && attempt < maxAttempts - 1) {
        attempt += 1;
        await sleep(waitMsForRetry(error));
        continue;
      }

      throw error;
    }

    throw new PartnerApiError({
      status: 503,
      message: "ArchWalk Partner API request failed after retries.",
    });
  }

  return {
    get config() {
      return config;
    },

    async createOrResolveExperience(
      identity: ExperienceIdentity = {
        name: property.name,
        external_resource_id: property.externalListingKey,
      },
    ): Promise<PartnerExperience> {
      const result = await request<PartnerExperience>(
        "POST",
        "/api/v1/360/experiences",
        {
          idempotent: true,
          body: {
            name: identity.name,
            external_resource_id: identity.external_resource_id,
            ...(identity.external_customer_id
              ? { external_customer_id: identity.external_customer_id }
              : {}),
          },
        },
      );
      return result.data;
    },

    async getExperienceByExternalId(
      identity: Pick<
        ExperienceIdentity,
        "external_resource_id" | "external_customer_id"
      > = { external_resource_id: property.externalListingKey },
    ): Promise<PartnerExperience | null> {
      if (!config.configured) return null;

      const query = new URLSearchParams({
        external_resource_id: identity.external_resource_id,
        limit: "1",
      });
      if (identity.external_customer_id) {
        query.set("external_customer_id", identity.external_customer_id);
      }
      const result = await request<{ items: PartnerExperience[] }>(
        "GET",
        `/api/v1/360/experiences?${query.toString()}`,
        { idempotent: true },
      );
      return result.data.items[0] ?? null;
    },

    async mintCreatorSession(
      origin: string,
      experienceId: string,
    ): Promise<CreatorSessionResponse> {
      const result = await request<CreatorSessionResponse>(
        "POST",
        "/api/v1/360/creator-sessions",
        {
          idempotent: false,
          body: {
            origin,
            experience_id: experienceId,
            permitted_actions: [...CREATOR_PERMITTED_ACTIONS],
          },
        },
      );
      return result.data;
    },
  };
}
