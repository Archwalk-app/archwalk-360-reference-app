import type { ViewerAnalyticsMessage } from "./archwalk/protocol";
export type DemoEvent = "demo_open" | "demo_tour_start" | "demo_viewer_loaded" | "demo_interaction"
  | "demo_scene_change" | "demo_fullscreen" | "demo_engaged" | "demo_photo_view"
  | "demo_load_error" | "demo_return_to_website";
export type DemoParameters = { scene_index?: number; interaction_kind?: "pointer" | "wheel" | "keyboard";
  error_code?: "viewer_unavailable" | "viewer_load_failed" | "panorama_load_failed" | "fullscreen_unavailable";
  fullscreen_mode?: "native" | "immersive" };
export type DemoSender = (name: DemoEvent, parameters?: DemoParameters) => boolean | void;

/** One instance per iframe mount; initialization never qualifies as engagement. */
export function createDemoEngagement(send: DemoSender) {
  let started = false;
  let ready = false, engaged = false, interaction = false;
  let scene: number | null = null;
  let count = 0;
  let native = false, immersive = false;
  const errors = new Set<string>();
  const engage = () => {
    if (!engaged) { engaged = true; send("demo_engaged"); }
  };
  return {
    start() { if (!started) started = send("demo_tour_start") !== false; },
    fullscreen(value: boolean, mode: "native" | "immersive") {
      const previous = native || immersive;
      if (mode === "native") native = value; else immersive = value;
      if (!previous && (native || immersive)) send("demo_fullscreen", { fullscreen_mode: mode });
    },
    receive(message: ViewerAnalyticsMessage) {
      switch (message.type) {
        case "ready":
          if (ready) return;
          ready = true; scene = message.activePanoramaIndex; count = message.panoramaCount;
          send("demo_viewer_loaded", { scene_index: scene });
          break;
        case "interaction":
          if (interaction) return;
          interaction = true;
          send("demo_interaction", { interaction_kind: message.kind }); engage();
          break;
        case "panoramaChanged":
          if (!ready || message.activePanoramaIndex >= count || message.activePanoramaIndex === scene) return;
          scene = message.activePanoramaIndex;
          send("demo_scene_change", { scene_index: scene }); engage();
          break;
        case "fullscreenChanged": this.fullscreen(message.fullscreen, "native"); break;
        case "error":
          if (errors.has(message.code)) return;
          errors.add(message.code); send("demo_load_error", { error_code: message.code });
      }
    },
  };
}
