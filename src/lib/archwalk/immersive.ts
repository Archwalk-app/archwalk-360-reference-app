/** Capability-negotiated CSS immersive transport; never claims native fullscreen. */
export const IMMERSIVE_SOURCE = "archwalk360-immersive";
export type ImmersiveMessage = {
  source: typeof IMMERSIVE_SOURCE;
  version: 1;
  type: "hello" | "ready" | "request" | "changed";
  expanded: boolean;
};
export function immersiveMessage(
  type: ImmersiveMessage["type"],
  expanded = false,
): ImmersiveMessage {
  return { source: IMMERSIVE_SOURCE, version: 1, type, expanded };
}
export function isImmersiveMessage(value: unknown): value is ImmersiveMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const m = value as Record<string, unknown>;
  return (
    Object.keys(m).length === 4 &&
    Object.keys(m).every((k) =>
      ["source", "version", "type", "expanded"].includes(k),
    ) &&
    m.source === IMMERSIVE_SOURCE &&
    m.version === 1 &&
    ["hello", "ready", "request", "changed"].includes(String(m.type)) &&
    typeof m.expanded === "boolean"
  );
}
