export const ARCHWALK_MESSAGE_SOURCE = "archwalk360";
export const ARCHWALK_MESSAGE_VERSION = 1;

export type ArchWalkEnvelope = {
  source: typeof ARCHWALK_MESSAGE_SOURCE;
  version: typeof ARCHWALK_MESSAGE_VERSION;
  type: string;
};

export function isArchWalkEnvelope(data: unknown): data is ArchWalkEnvelope {
  if (typeof data !== "object" || data === null) return false;
  const record = data as Record<string, unknown>;
  return (
    record.source === ARCHWALK_MESSAGE_SOURCE &&
    record.version === ARCHWALK_MESSAGE_VERSION &&
    typeof record.type === "string"
  );
}

export function isTrustedArchWalkMessage(
  event: { origin: string; source: unknown; data: unknown },
  expectedOrigin: string,
  expectedSource: unknown,
): boolean {
  return (
    event.origin === expectedOrigin &&
    expectedSource !== null &&
    event.source === expectedSource &&
    isArchWalkEnvelope(event.data)
  );
}

export function creatorInitMessage(token: string): ArchWalkEnvelope & {
  token: string;
} {
  return {
    source: ARCHWALK_MESSAGE_SOURCE,
    version: ARCHWALK_MESSAGE_VERSION,
    type: "creator:init",
    token,
  };
}

export function viewerInitMessage(): ArchWalkEnvelope {
  return {
    source: ARCHWALK_MESSAGE_SOURCE,
    version: ARCHWALK_MESSAGE_VERSION,
    type: "init",
  };
}

/** AW360-016 V1 flat envelopes. Kept compatible with lib/archwalk-360-embed.ts
 * in ArchWalk. Validate before projecting a tiny analytics parameter allowlist. */
export type ViewerAnalyticsMessage =
  | (ArchWalkEnvelope & { type: "ready"; panoramaCount: number; activePanoramaIndex: number })
  | (ArchWalkEnvelope & { type: "panoramaChanged"; activePanoramaIndex: number; label: string })
  | (ArchWalkEnvelope & { type: "interaction"; kind: "pointer" | "wheel" | "keyboard" })
  | (ArchWalkEnvelope & { type: "error"; code: "viewer_unavailable" | "viewer_load_failed" | "panorama_load_failed" | "fullscreen_unavailable" })
  | (ArchWalkEnvelope & { type: "fullscreenChanged"; fullscreen: boolean });

export function parseViewerAnalyticsMessage(
  event: { origin: string; source: unknown; data: unknown },
  expectedOrigin: string,
  expectedSource: unknown,
): ViewerAnalyticsMessage | null {
  if (!expectedSource || Array.isArray(event.data)
    || !isTrustedArchWalkMessage(event, expectedOrigin, expectedSource)) return null;
  const data = event.data as Record<string, unknown>;
  const keys: Record<string, string[]> = {
    ready: ["panoramaCount", "activePanoramaIndex"], panoramaChanged: ["activePanoramaIndex", "label"],
    interaction: ["kind"], error: ["code"], fullscreenChanged: ["fullscreen"],
  };
  const payloadKeys = Object.hasOwn(keys, data.type as string) ? keys[data.type as string] : null;
  if (!payloadKeys || Object.keys(data).length !== payloadKeys.length + 3
    || !payloadKeys.every(key => Object.hasOwn(data, key))) return null;
  const index = (n: unknown) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
  const valid = data.type === "ready" ? index(data.panoramaCount) && (data.panoramaCount as number) > 0
      && index(data.activePanoramaIndex) && (data.activePanoramaIndex as number) < (data.panoramaCount as number)
    : data.type === "panoramaChanged" ? index(data.activePanoramaIndex) && typeof data.label === "string"
    : data.type === "interaction" ? ["pointer", "wheel", "keyboard"].includes(data.kind as string)
    : data.type === "error" ? ["viewer_unavailable", "viewer_load_failed", "panorama_load_failed", "fullscreen_unavailable"].includes(data.code as string)
    : typeof data.fullscreen === "boolean";
  return valid ? data as ViewerAnalyticsMessage : null;
}

export function creatorIframeSrc(
  appOrigin: string,
  sessionApiId: string,
): string {
  return `${appOrigin}/aw360/c/${sessionApiId}`;
}

export function viewerIframeSrc(appOrigin: string, publicId: string): string {
  return `${appOrigin}/aw360/v/${publicId}`;
}

export function tokenAppearsInUrl(url: string, token: string): boolean {
  return token.length > 0 && url.includes(token);
}
