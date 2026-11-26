import test from "node:test";
import assert from "node:assert/strict";
import { parseViewerAnalyticsMessage } from "./protocol";
import { createDemoEngagement, type DemoEvent, type DemoParameters } from "../demo-engagement";

const origin = "https://archwalk.app";
const frame = {};
const envelope = (type: string, data = {}) => ({ source: "archwalk360", version: 1, type, ...data });
function parse(data: unknown, source: unknown = frame, from = origin) {
  return parseViewerAnalyticsMessage({ origin: from, source, data }, origin, frame);
}
test("AW360-016 accepts only trusted, typed, exact payloads", () => {
  const ready = envelope("ready", { panoramaCount: 5, activePanoramaIndex: 0 });
  assert.ok(parse(ready));
  for (const data of [null, [], {}, { ...ready, version: 2 }, { ...ready, source: "evil" },
    { ...ready, token: "PRIVATE" }, { ...ready, panoramaCount: 0 }, { ...ready, activePanoramaIndex: 5 },
    { ...ready, activePanoramaIndex: NaN }, { ...ready, activePanoramaIndex: 0.5 },
    envelope("interaction", { kind: "PRIVATE" }), envelope("error", { code: "PRIVATE" }),
    envelope("fullscreenChanged", { fullscreen: "yes" }), envelope("panoramaChanged", { activePanoramaIndex: -1, label: "x" }),
    envelope("resize", { width: 100, height: 100 }), envelope("pong"), envelope("toString")]) assert.equal(parse(data), null);
  assert.equal(parse(ready, {}), null);
  assert.equal(parse(ready, frame, "https://evil.test"), null);
  assert.equal(parseViewerAnalyticsMessage({ origin, source: null, data: ready }, origin, null), null);
});
test("ready and initial panorama do not engage; subsequent successful scenes do; mounts reset", () => {
  const events: { name: DemoEvent; parameters?: DemoParameters }[] = [];
  const create = () => createDemoEngagement((name, parameters) => { events.push({ name, parameters }); });
  const session = create();
  const receive = (type: string, payload = {}) => {
    const message = parse(envelope(type, payload)); assert.ok(message); session.receive(message);
  };
  session.start(); session.start();
  receive("panoramaChanged", { activePanoramaIndex: 2, label: "PRIVATE BEFORE READY" });
  receive("ready", { panoramaCount: 5, activePanoramaIndex: 0 });
  receive("ready", { panoramaCount: 5, activePanoramaIndex: 0 });
  receive("panoramaChanged", { activePanoramaIndex: 0, label: "PRIVATE INITIAL" });
  assert.deepEqual(events.map(e => e.name), ["demo_tour_start", "demo_viewer_loaded"]);
  receive("panoramaChanged", { activePanoramaIndex: 1, label: "PRIVATE ROOM" });
  receive("panoramaChanged", { activePanoramaIndex: 1, label: "PRIVATE ROOM" });
  receive("panoramaChanged", { activePanoramaIndex: 99, label: "INVALID INDEX" });
  receive("interaction", { kind: "pointer" }); receive("interaction", { kind: "pointer" });
  receive("error", { code: "panorama_load_failed" }); receive("error", { code: "panorama_load_failed" });
  assert.equal(events.filter(e => e.name === "demo_engaged").length, 1);
  assert.equal(events.filter(e => e.name === "demo_interaction").length, 1);
  assert.equal(events.filter(e => e.name === "demo_scene_change").length, 1);
  assert.equal(events.filter(e => e.name === "demo_load_error").length, 1);
  assert.ok(!JSON.stringify(events).includes("PRIVATE"));
  const remount = create(); remount.start(); remount.receive(parse(envelope("ready", { panoramaCount: 5, activePanoramaIndex: 0 }))!);
  assert.equal(events.filter(e => e.name === "demo_tour_start").length, 2);
  assert.equal(events.filter(e => e.name === "demo_viewer_loaded").length, 2);
});
test("actual first interaction engages; fullscreen transitions dedupe and exit is silent", () => {
  const events: string[] = [];
  const session = createDemoEngagement(name => { events.push(name); });
  session.receive(parse(envelope("interaction", { kind: "keyboard" }))!);
  session.receive(parse(envelope("interaction", { kind: "wheel" }))!);
  assert.deepEqual(events, ["demo_interaction", "demo_engaged"]);
  session.fullscreen(false, "native"); session.fullscreen(true, "native"); session.fullscreen(true, "native");
  session.fullscreen(true, "immersive"); session.fullscreen(false, "native"); session.fullscreen(false, "immersive");
  assert.equal(events.filter(name => name === "demo_fullscreen").length, 1);
  session.fullscreen(true, "immersive"); session.fullscreen(false, "immersive");
  assert.equal(events.filter(name => name === "demo_fullscreen").length, 2);
});
