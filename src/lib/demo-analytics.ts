import { sendAnalyticsEvent, startAnalytics } from "./analytics-runtime";
import type { DemoEvent, DemoParameters } from "./demo-engagement";
let opened = "";

export function trackDemoEvent(name: DemoEvent, parameters: DemoParameters = {}) {
  // Initialize if a child effect runs before the layout's consent effect.
  startAnalytics();
  // Project fields explicitly: callers cannot accidentally spread private data.
  const safe: Record<string, string | number> = { demo_type: "hallwyl_museum" };
  if (Number.isSafeInteger(parameters.scene_index) && parameters.scene_index! >= 0) safe.scene_index = parameters.scene_index!;
  if (["pointer", "wheel", "keyboard"].includes(parameters.interaction_kind ?? "")) safe.interaction_kind = parameters.interaction_kind!;
  if (["viewer_unavailable", "viewer_load_failed", "panorama_load_failed", "fullscreen_unavailable"].includes(parameters.error_code ?? "")) safe.error_code = parameters.error_code!;
  if (parameters.fullscreen_mode === "native" || parameters.fullscreen_mode === "immersive") safe.fullscreen_mode = parameters.fullscreen_mode;
  return sendAnalyticsEvent(name, safe);
}
export function trackDemoOpen() {
  const page = location.origin + location.pathname;
  if (opened === page) return;
  if (trackDemoEvent("demo_open")) opened = page;
}
