import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

// Both production builds must include the measurement ID. All GA collection is
// intercepted, while the real Google script exercises cookie/session behavior.
const marketing = process.env.ANALYTICS_TEST_MARKETING_URL || "http://127.0.0.1:3030";
const demo = process.env.ANALYTICS_TEST_DEMO_URL || "http://127.0.0.1:3031";
const key = "archwalk_analytics_marketing_demo_v2";

// The live stream still has EM enabled. Emulate the required release settings
// locally; never mutate GA Admin and never let collection reach the property.
function releaseSettings(script) {
  if (!script.includes('__ccd_em_') && script.includes('Copyright 2012 Google Inc.')) return script;
  if (!script.includes('__ccd_em_page_view')) throw new Error('Google fixture shape changed; review EM simulation: ' + script.slice(0, 80));
  return script.replace(/"function":"__ccd_em_[^"]+"/g, '"function":"__ccd_em_page_view","vtp_historyEvents":false')
    .replace(/"vtp_historyEvents":true/g, '"vtp_historyEvents":false')
    .replace(/"vtp_enable(?:OutboundClick|Scroll|Download|HistoryEvents|Form|Video|PageView)":true/g, text => text.replace(':true', ':false'));
}

const browser = await chromium.launch();
const contexts = [];
const frameHtml = `<!doctype html><button id="ready">Ready</button><button id="interact">Interact</button><button id="scene">Scene</button><button id="enter">Enter immersive</button><button id="exit">Exit immersive</button><button id="native">Native fullscreen</button><button id="leave">Leave fullscreen</button><button id="error">Error</button><button id="invalid">Invalid</button>
<script>
const post=(type,data={})=>parent.postMessage({source:'archwalk360',version:1,type,...data},'https://demo.archwalk.app');
ready.onclick=()=>post('ready',{panoramaCount:5,activePanoramaIndex:0});
interact.onclick=()=>post('interaction',{kind:'pointer'});
scene.onclick=()=>post('panoramaChanged',{activePanoramaIndex:1,label:'PRIVATE ROOM LABEL'});
enter.onclick=()=>parent.postMessage({source:'archwalk360-immersive',version:1,type:'request',expanded:true},'https://demo.archwalk.app');
exit.onclick=()=>parent.postMessage({source:'archwalk360-immersive',version:1,type:'request',expanded:false},'https://demo.archwalk.app');
native.onclick=()=>post('fullscreenChanged',{fullscreen:true});
leave.onclick=()=>post('fullscreenChanged',{fullscreen:false});
error.onclick=()=>post('error',{code:'panorama_load_failed'});
invalid.onclick=()=>{post('interaction',{kind:'PRIVATE'});post('error',{code:'PRIVATE'});post('ready',{panoramaCount:5,activePanoramaIndex:0,token:'PRIVATE'});parent.postMessage({source:'archwalk360',version:2,type:'interaction',kind:'wheel'},'*');};
</script>`;

function parseEvents(request) {
  const query = Object.fromEntries(new URL(request.url()).searchParams);
  const lines = (request.postData() || "").split(/\r?\n/).filter(Boolean);
  return lines.length ? lines.map(line => ({ ...query, ...Object.fromEntries(new URLSearchParams(line)) })) : [query];
}
async function setup() {
  const context = await browser.newContext(); contexts.push(context);
  context.setDefaultTimeout(15000);
  const events = [], google = [];
  await context.route("**/*", async route => {
    const request = route.request(), url = new URL(request.url());
    if (/google-analytics\.com$|analytics\.google\.com$/.test(url.hostname)) {
      events.push(...parseEvents(request)); return route.fulfill({ status: 204 });
    }
    if (url.hostname === "www.googletagmanager.com") {
      google.push(url.href);
      const response = await route.fetch();
      return route.fulfill({ response, body: releaseSettings(await response.text()) });
    }
    if (url.pathname.startsWith("/aw360/v/")) return route.fulfill({ contentType: "text/html", body: frameHtml });
    if (["archwalk.app", "www.archwalk.app", "demo.archwalk.app", "preview.vercel.app", "localhost"].includes(url.hostname)) {
      const local = url.hostname === "archwalk.app" || url.hostname === "www.archwalk.app" ? marketing : demo;
      const response = await route.fetch({ url: local + url.pathname + url.search, headers: { ...request.headers(), host: url.host } });
      return route.fulfill({ response });
    }
    return route.fulfill({ status: 204 });
  });
  const page = await context.newPage();
  const count = name => events.filter(event => event.en === name).length;
  const wait = async (name, number) => {
    try { await expect.poll(() => count(name), { timeout: 20000 }).toBe(number); }
    catch (error) {
      console.error("Collection check failed:", name, "expected", number, "received", count(name));
      for (const current of context.pages()) console.error(await current.evaluate(() => ({
        path: location.pathname, disabled: window["ga-disable-G-MZYPJQTCPJ"],
        queued: (window.dataLayer || []).filter(row => row[0] === "event").map(row => row[1]),
      })));
      throw error;
    }
  };
  return { context, page, events, google, count, wait };
}
try {
  const state = await setup();
  const { page } = state;
  await page.goto("https://archwalk.app/blog?token=PRIVATE#PRIVATE");
  await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  assert.equal(state.google.length, 0); assert.equal(state.events.length, 0);
  // A legacy local grant must not silently extend to the demo.
  await page.evaluate(() => localStorage.setItem("archwalk.analytics-consent.v1", "granted"));
  await page.reload();
  await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
  await expect(page.getByText(/across archwalk.app and demo.archwalk.app/)).toBeVisible();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await page.waitForTimeout(500); assert.equal(state.google.length, 0);
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Optional analytics" })).toBeFocused();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await state.wait("page_view", 1);
  assert.ok(state.events.every(event => !JSON.stringify(event).includes("PRIVATE")));
  assert.equal(state.events.find(event => event.en === "page_view").dl, "https://archwalk.app/blog");
  await page.evaluate(() => { history.pushState({}, "", "/blog?tour=1#rooms"); });
  await page.waitForTimeout(500); assert.equal(state.count("page_view"), 1);
  // Prevent the test click from opening a third tab; delegated tracking still runs.
  await page.evaluate(() => {
    const link = document.querySelector('a[href="https://demo.archwalk.app/viewer"]');
    if (!link) throw new Error("No demo CTA");
    link.addEventListener("click", event => event.preventDefault()); link.click();
  });
  await state.wait("demo_cta_click", 1); await state.wait("blog_demo_click", 1);
  console.log("PASS: marketing consent and sanitized views/CTA");
  const marketingHit = state.events.find(event => event.en === "page_view");
  const demoPage = await state.context.newPage();
  await demoPage.goto("https://demo.archwalk.app/viewer?tour=1#rooms");
  await expect(demoPage.locator("iframe")).toHaveCount(1);
  await state.wait("page_view", 2); await state.wait("demo_open", 1); await state.wait("demo_tour_start", 1);
  assert.equal(await demoPage.getByRole("button", { name: "Accept", exact: true }).count(), 0);
  const demoHit = state.events.filter(event => event.en === "page_view")[1];
  assert.equal(demoHit.dl, "https://demo.archwalk.app/viewer");
  assert.equal(demoHit.cid, marketingHit.cid); assert.equal(demoHit.sid, marketingHit.sid);
  const gaCookies = (await state.context.cookies()).filter(cookie => /^_ga/.test(cookie.name));
  assert.ok(gaCookies.length > 0 && gaCookies.every(cookie => cookie.domain === ".archwalk.app"));
  assert.equal(state.count("demo_viewer_loaded"), 0); // iframe load alone proves nothing
  console.log("PASS: shared client and session across domains");
  const frame = demoPage.frameLocator("iframe");
  await frame.locator("#invalid").click();
  await demoPage.evaluate(() => window.postMessage({ source: "archwalk360", version: 1, type: "interaction", kind: "wheel" }, "*"));
  await page.waitForTimeout(500); assert.equal(state.count("demo_interaction"), 0);
  await frame.locator("#ready").click(); await frame.locator("#ready").click();
  await state.wait("demo_viewer_loaded", 1); assert.equal(state.count("demo_engaged"), 0);
  await frame.locator("#scene").click(); await frame.locator("#scene").click();
  await state.wait("demo_scene_change", 1); await state.wait("demo_engaged", 1);
  await frame.locator("#interact").click(); await frame.locator("#interact").click();
  await state.wait("demo_interaction", 1); assert.equal(state.count("demo_engaged"), 1);
  await frame.locator("#error").click(); await frame.locator("#error").click(); await state.wait("demo_load_error", 1);
  console.log("PASS: bridge validation, readiness and engagement");
  await frame.locator("#enter").click(); await frame.locator("#enter").click(); await state.wait("demo_fullscreen", 1);
  await frame.locator("#exit").click();
  await frame.locator("#native").click(); await frame.locator("#native").click(); await state.wait("demo_fullscreen", 2);
  await frame.locator("#leave").click();
  console.log("PASS: fullscreen transitions");
  await demoPage.locator(".museum-photo-choice").click();
  await expect(demoPage.locator("iframe")).toHaveCount(0);
  await demoPage.locator(".museum-photo-rail button").nth(1).click();
  await demoPage.locator(".museum-photo-rail button").nth(1).click(); await state.wait("demo_photo_view", 1);
  await demoPage.locator(".museum-tour-action").click(); await state.wait("demo_tour_start", 2);
  await frame.locator("#ready").click(); await state.wait("demo_viewer_loaded", 2);
  await frame.locator("#interact").click(); await state.wait("demo_engaged", 2);
  assert.equal(state.count("demo_open"), 1); assert.equal(state.count("page_view"), 2);
  await demoPage.evaluate(() => { const link = document.querySelector('a[href="https://archwalk.app"]'); link.addEventListener("click", e => e.preventDefault()); link.click(); });
  await state.wait("demo_return_to_website", 1);
  assert.ok(state.events.every(event => !JSON.stringify(event).includes("PRIVATE")));
  await demoPage.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await demoPage.getByRole("button", { name: "Decline", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window["ga-disable-G-MZYPJQTCPJ"])).toBe(true);
  assert.equal((await state.context.cookies()).filter(cookie => /^_ga/.test(cookie.name)).length, 0);
  const before = state.count("demo_interaction");
  await frame.locator("#interact").click(); await page.waitForTimeout(600);
  assert.equal(state.count("demo_interaction"), before);
  assert.equal((await state.context.cookies()).find(cookie => cookie.name === key).value, "denied");
  // Reaccept then withdraw from marketing: the other direction must also stop demo.
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await expect.poll(() => demoPage.evaluate(() => window["ga-disable-G-MZYPJQTCPJ"])).toBe(false);
  await page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await expect.poll(() => demoPage.evaluate(() => window["ga-disable-G-MZYPJQTCPJ"])).toBe(true);
  // A direct tour entry without any consent remains silent, even after readiness.
  const quiet = await setup();
  await quiet.page.goto("https://demo.archwalk.app/viewer?tour=1#rooms");
  await expect(quiet.page.getByRole("button", { name: "Accept", exact: true })).toBeVisible();
  await quiet.page.frameLocator("iframe").locator("#ready").click();
  await quiet.page.waitForTimeout(500);
  assert.equal(quiet.google.length, 0); assert.equal(quiet.events.length, 0);
  await quiet.page.getByRole("button", { name: "Decline", exact: true }).click();
  await quiet.page.getByRole("button", { name: "Cookie preferences", exact: true }).click();
  await quiet.page.getByRole("button", { name: "Accept", exact: true }).click();
  await quiet.wait("page_view", 1); await quiet.wait("demo_open", 1); await quiet.wait("demo_tour_start", 1);
  assert.equal(quiet.count("demo_viewer_loaded"), 0); assert.equal(quiet.count("demo_engaged"), 0);
  await quiet.page.getByRole("link", { name: "Credits", exact: true }).first().click();
  await quiet.wait("page_view", 2); await quiet.wait("demo_open", 2);
  // Fresh contexts test production host restrictions and private entries.
  for (const url of ["https://localhost/viewer", "https://preview.vercel.app/viewer", "https://demo.archwalk.app/demo-login", "https://demo.archwalk.app/plugin", "https://demo.archwalk.app/editor"]) {
    const excluded = await setup();
    await excluded.context.addCookies([{ name: key, value: "granted", domain: ".archwalk.app", path: "/", secure: true }]);
    await excluded.page.goto(url); await excluded.page.waitForTimeout(500);
    assert.equal(excluded.google.length, 0, url); assert.equal(excluded.events.length, 0, url);
  }
  console.log("PASS: production consent, sanitized views, cross-domain GA session, demo lifecycle, invalid messages, fullscreen, remounts, withdrawal and route gates");
} finally {
  await Promise.allSettled(contexts.map(context => context.unrouteAll({ behavior: "ignoreErrors" })));
  await browser.close();
}
