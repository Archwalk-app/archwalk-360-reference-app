/* eslint-disable @typescript-eslint/no-explicit-any -- isolated VM browser fixture */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the real modules in isolated documents with a shared first-party cookie jar.
const lib = process.cwd().endsWith("archwalk-360-reference-app") ? "src/lib" : "lib";
function documentAt(href: string, jar = new Map<string, string>(), env = "production", preview = "", blocked = false, ignoreWrites = false) {
  const location = new URL(href);
  const window = new EventTarget() as EventTarget & Record<string, any>;
  const document = new EventTarget();
  const writes: string[] = [];
  const timers: (() => void)[] = [];
  Object.defineProperty(document, "cookie", {
    get: () => { if (blocked) throw new Error("Cookies blocked"); return [...jar].map(([key, value]) => key + "=" + value).join("; "); },
    set: (cookie: string) => {
      if (blocked) throw new Error("Cookies blocked");
      if (ignoreWrites) return;
      writes.push(cookie);
      const [name, value] = cookie.split(";")[0].split("=");
      if (cookie.includes("Max-Age=0")) jar.delete(name); else jar.set(name, value);
    },
  });
  Object.assign(window, { self: window, top: window, location, setInterval: (fn: () => void) => { timers.push(fn); return timers.length; }, clearInterval() {} });
  const history = { pushState(_data: unknown, _unused: string, href?: string) { if (href) location.href = new URL(href, location).href; }, replaceState(_data: unknown, _unused: string, href?: string) { if (href) location.href = new URL(href, location).href; } };
  const modules = new Map<string, any>();
  const context = vm.createContext({ URL, window, document, history, location, Event, Element: class {}, HTMLAnchorElement: class {},
    process: { env: { NODE_ENV: env, NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-MZYPJQTCPJ", NEXT_PUBLIC_VERCEL_ENV: preview } } });
  function load(name: string): any {
    if (modules.has(name)) return modules.get(name);
    const exports = {};
    modules.set(name, exports);
    const code = ts.transpileModule(readFileSync(lib + "/" + name + ".ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const run = vm.runInContext("(function(exports, require){" + code + "\n})", context);
    run(exports, (path: string) => load(path.replace(/^\.\//, "")));
    return exports;
  }
  const api = load("analytics-runtime");
  const events = () => (window.dataLayer ?? []).filter((row: any) => row[0] === "event").map((row: any) => ({ name: row[1], parameters: row[2] }));
  return { api, window, history, jar, timers, writes, events, load };
}
const demo = lib.startsWith("src");
const host = demo ? "demo.archwalk.app" : "archwalk.app";
const path = demo ? "/viewer" : "/blog";
const publicUrl = "https://" + host + path;

test("unknown, declined and old unscoped grants never initialize Google", () => {
  const doc = documentAt(publicUrl);
  doc.jar.set("archwalk.analytics-consent.v1", "granted");
  doc.api.startAnalytics();
  assert.equal(doc.window.dataLayer, undefined);
  doc.api.setAnalyticsConsent("denied"); doc.api.startAnalytics();
  assert.equal(doc.window.dataLayer, undefined);
  assert.equal(doc.api.readAnalyticsConsent(), "denied");
});
test("explicit consent uses shared scope, sanitized manual views and no duplicate anchors/queries", () => {
  const doc = documentAt(publicUrl + "?token=PRIVATE#email=PRIVATE");
  doc.api.setAnalyticsConsent("granted"); doc.api.startAnalytics(); doc.api.trackPageView();
  assert.ok(doc.writes.some(cookie => cookie.includes("Domain=archwalk.app; Secure; SameSite=Lax")));
  assert.equal(doc.events().length, 1);
  const config = doc.window.dataLayer.find((row: any) => row[0] === "config")[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.cookie_domain, "archwalk.app");
  assert.equal(config.allow_google_signals, false);
  doc.history.pushState({}, "", path + "?tour=1#rooms");
  assert.equal(doc.events().length, 1);
  const next = demo ? "/viewer/credits" : "/360";
  doc.history.pushState({}, "", next + "?secret=PRIVATE");
  doc.api.trackPageView();
  assert.equal(doc.events().length, 2);
  assert.ok(!JSON.stringify(doc.window.dataLayer).includes("PRIVATE"));
  assert.equal(doc.events()[1].parameters.page_location, "https://" + host + next);
  doc.history.pushState({}, "", path);
  assert.equal(doc.events().length, 3);
});
test("withdrawal reaches both documents and clears shared GA identifiers", () => {
  const jar = new Map<string, string>();
  const first = documentAt(publicUrl, jar), second = documentAt(publicUrl, jar);
  first.api.setAnalyticsConsent("granted");
  jar.set("_ga", "existing-shared-client");
  second.api.pauseAnalytics(); // pre-hydration effect must preserve shared identifiers
  assert.equal(jar.get("_ga"), "existing-shared-client");
  second.api.startAnalytics();
  let changes = 0;
  second.api.observeAnalyticsConsent(() => changes++);
  jar.set("_ga", "fixture"); jar.set("_ga_MZYPJQTCPJ", "fixture-session");
  first.api.setAnalyticsConsent("denied");
  second.timers.forEach(fn => fn());
  assert.equal(changes, 1);
  assert.equal(second.window["ga-disable-G-MZYPJQTCPJ"], true);
  assert.equal(jar.has("_ga"), false);
  second.api.sendAnalyticsEvent("generate_lead");
  assert.equal(second.events().length, 1);
  first.api.setAnalyticsConsent("granted");
  jar.set("_ga", "existing-shared-client");
  second.api.pauseAnalytics(); // pre-hydration effect must preserve shared identifiers
  assert.equal(jar.get("_ga"), "existing-shared-client");
  second.api.startAnalytics();
  assert.equal(second.window.dataLayer.filter((row: any) => row[0] === "config").length, 1);
  assert.equal(second.events().length, 1);
});
test("host, environment, frame and private-path gates fail closed", () => {
  for (const url of ["http://" + host + path, "https://localhost" + path, "https://preview.vercel.app" + path,
    "https://staging.archwalk.app" + path, "https://" + host + "/editor", "https://" + host + "/plugin",
    "https://" + host + "/auth/login", "https://" + host + "/api/test", "https://" + host + "/dashboard"]) {
    const doc = documentAt(url); doc.api.setAnalyticsConsent("granted"); doc.api.startAnalytics();
    assert.equal(doc.window.dataLayer, undefined, url);
  }
  for (const doc of [documentAt(publicUrl, undefined, "development"), documentAt(publicUrl, undefined, "production", "preview")])
    assert.equal(doc.api.analyticsAllowed(), false);
  const framed = documentAt(publicUrl); framed.window.top = {};
  assert.equal(framed.api.analyticsAllowed(), false);
  const doc = documentAt(publicUrl); doc.api.setAnalyticsConsent("granted");
  doc.history.pushState({}, "", "/editor?token=PRIVATE");
  assert.equal(doc.window["ga-disable-G-MZYPJQTCPJ"], true);
  doc.history.replaceState({}, "", path); doc.api.startAnalytics(); doc.api.sendAnalyticsEvent("test");
  assert.equal(doc.events().length, 1);
  assert.ok(!JSON.stringify(doc.window.dataLayer).includes("PRIVATE"));
});


test("blocked cookie access fails closed without breaking the document", () => {
  const doc = documentAt(publicUrl, undefined, "production", "", true);
  assert.equal(doc.api.readAnalyticsConsent(), null);
  doc.api.pauseAnalytics(); doc.api.setAnalyticsConsent("granted"); doc.api.startAnalytics();
  assert.equal(doc.window.dataLayer, undefined);
});


test("a refused withdrawal write cannot reactivate an old stored grant", () => {
  const first = documentAt(publicUrl); first.api.setAnalyticsConsent("granted");
  const doc = documentAt(publicUrl, first.jar, "production", "", false, true);
  doc.api.setAnalyticsConsent("denied"); doc.api.startAnalytics();
  assert.equal(doc.window["ga-disable-G-MZYPJQTCPJ"], true);
  assert.equal(doc.window.dataLayer, undefined);
});

test("demo withdrawal revokes acquisition scope and demo acceptance cannot revive it", () => {
  const doc = documentAt(publicUrl);
  doc.jar.set("archwalk_acquisition_consent_v1", "granted." + Date.now());
  doc.jar.set("archwalk_acquisition_context_v1", "123.456.789");
  doc.api.setAnalyticsConsent("denied");
  assert.ok(doc.jar.get("archwalk_acquisition_consent_v1")?.startsWith("denied."));
  assert.equal(doc.jar.has("archwalk_acquisition_context_v1"), false);
  doc.api.setAnalyticsConsent("granted");
  assert.ok(doc.jar.get("archwalk_acquisition_consent_v1")?.startsWith("denied."));
});
