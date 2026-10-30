import { property } from "@/lib/property";
import { createPartnerClient } from "./client";
import { PartnerApiError } from "./errors";

export const HALLWYL_EXPERIENCE_ID = "166ac0f6-28c0-4858-92fc-f06243b0becc";
export const HALLWYL_PUBLIC_ID = "1e00029c-d4ff-4a22-8d5b-c95d10ae3f57";

export function createMuseumClient() {
  return createPartnerClient({
    env: {
      ...process.env,
      ARCHWALK_API_BASE:
        process.env.HALLWYL_API_BASE || process.env.ARCHWALK_API_BASE,
      ARCHWALK_APP_ORIGIN:
        process.env.HALLWYL_APP_ORIGIN || process.env.ARCHWALK_APP_ORIGIN,
      AW360_API_KEY: process.env.HALLWYL_API_KEY || process.env.AW360_API_KEY,
    },
  });
}

/** Server-only consumers: never import this module into a client component. */
export function getMuseumIdentity(
  env: Record<string, string | undefined> = process.env,
) {
  return {
    external_resource_id:
      env.HALLWYL_ITEM_ID?.trim() || property.externalListingKey,
    ...(env.HALLWYL_CUSTOMER_ID?.trim()
      ? { external_customer_id: env.HALLWYL_CUSTOMER_ID.trim() }
      : {}),
  };
}

export async function resolveMuseumExperience(client = createMuseumClient()) {
  const experience =
    await client.getExperienceByExternalId(getMuseumIdentity());
  if (
    !experience ||
    experience.experience_id !== HALLWYL_EXPERIENCE_ID ||
    experience.public_id !== HALLWYL_PUBLIC_ID
  ) {
    throw new PartnerApiError({
      status: 409,
      code: "hallwyl_connection_mismatch",
      message:
        "The configured Item ID does not resolve to the existing Hallwyl Museum Experience. No Experience was created or changed.",
    });
  }
  return experience;
}
