# Public marketing and demo analytics

GA4 property **561759115**, shared web stream **G-MZYPJQTCPJ**. Use the Hostname dimension to distinguish `archwalk.app` / `www.archwalk.app` from `demo.archwalk.app`. No new property, stream, or GTM container is needed.

## Production configuration and release ordering

1. Review both feature branches, the privacy disclosure, and this coordinated release. Do not merge, deploy, or change live GA settings as part of implementation.
2. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-MZYPJQTCPJ` in the marketing production build environment (currently Railway) and the demo's **Vercel Production** environment. Leave it unset in preview and development. These public values are compiled into client bundles; rebuild after changes. `next.config.ts` also embeds `VERCEL_ENV` as `NEXT_PUBLIC_VERCEL_ENV`; preview builds are excluded even if assigned a production alias. Non-Vercel preview hosting must supply `NEXT_PUBLIC_VERCEL_ENV=preview` if it uses a production hostname.
3. Immediately before the approved rollout, the GA owner must open Admin > Data streams > Web > Enhanced measurement and **disable Page views, including browser-history page changes**, plus scrolls, outbound clicks, site search, video engagement, downloads and form interactions. This is mandatory: `send_page_view:false` suppresses the config view but does not replace the stream's history setting. Keep Google signals, user-provided data and advertising personalization disabled; do not add automatic tags.
4. Deploy the reviewed marketing version first, then the reviewed demo version, with both builds using the same stream ID. Turning history measurement off first prevents duplicate/raw history views while old and new versions overlap. Previously open documents still run their old JavaScript: reload them when validating consent withdrawal and do not assume old v1 tabs implement the new shared preference. If rolling back, keep automatic measurement off until both applications' tracking behavior is reviewed together.
5. Verify both sites in a fresh browser using the checks below. No live settings were changed by this implementation.

## Consent and privacy boundaries

Only production HTTPS, top-level documents and explicitly allowed public paths initialize the Google script. Marketing keeps its public route allowlist; demo allows exactly `/viewer` and `/viewer/credits`. Localhost, preview hosts, frames, login, editor, plugin, API and private application routes are excluded. A synchronous pre-Google History API/click guard disables collection before entry to a private path and latches off until a fresh document loads, including when navigating back to a public path.

The first-party `archwalk_analytics_marketing_demo_v2` cookie stores `granted` or `denied` for 180 days, with `Domain=archwalk.app; Path=/; Secure; SameSite=Lax`. The banner explicitly names both marketing and demo domains before acceptance. **Old localStorage v1 grants are never migrated**, so existing users choose again. Cookie preferences and the marketing Privacy Policy are available from both public surfaces. Decline means the Google script is never requested. Blocked or refused cookie writes fail closed for the current document; a stored old grant cannot reactivate tracking after a failed withdrawal write. Advertising storage, ad user data, ad personalization and Google signals remain disabled.

Withdrawal on either site writes a shared denial, disables GA, updates consent and clears visible `_ga` cookies at host and parent-domain scopes. Other open documents check the shared cookie on focus/visibility and every second (background browser timer throttling can delay checks). Every custom event and page view independently rechecks it synchronously. Already in-flight requests cannot be recalled. Old host-only cookies on a sibling hostname can only be cleared when that hostname is visited or its open tab checks; new GA identifiers explicitly use the parent domain on both apps. Other essential technologies remain separate from this preference. The runtime is mirrored in the two independent repositories; keep its consent and page-view logic synchronized when making future changes.

Both applications use explicit `page_view` events, with `send_page_view:false`. Only origin plus allowlisted pathname is sent as `page_location`; `page_title` is a safe pathname and `page_referrer` is empty. Queries and fragments are discarded, including `/viewer?tour=1` and museum section anchors. A pathname change sends one view; query/hash changes and tour/photo toggles send none. The same ID, parent-domain GA cookies and cookie path preserve client/session continuity across the two subdomains after shared acceptance. External campaign attribution improvements are a separate follow-up: this implementation deliberately drops campaign queries and all referrers.

## Event definitions

All demo events include static `demo_type=hallwyl_museum`. Events never contain panorama labels, project/public IDs, tokens, form content, complete iframe messages, raw URLs or private referrers.

| Event | Trigger / safe parameters |
| --- | --- |
| `page_view` | Initial consented public document and each subsequent allowed pathname change; sanitized location, title and empty referrer |
| `demo_open` | Each consented public demo page visit; independent of tour mounts |
| `demo_tour_start` | Each interactive tour iframe mount, including direct `?tour=1` entry; if consent is accepted while it remains mounted, count its start then |
| `demo_viewer_loaded` | First valid AW360-016 `ready` per iframe mount; numeric `scene_index` |
| `demo_interaction` | First valid `interaction` per mount; `interaction_kind=pointer/wheel/keyboard` |
| `demo_scene_change` | Valid successful `panoramaChanged` after readiness, with a different in-range numeric `scene_index`; repeated current index ignored |
| `demo_fullscreen` | Transition into confirmed native fullscreen or applied host immersive mode; `fullscreen_mode=native/immersive`; exits are silent |
| `demo_engaged` | Once per iframe mount, on first actual interaction or first subsequent successful scene change after readiness; initialization, resize and heartbeat do not count |
| `demo_photo_view` | Selecting a different museum photograph; numeric `scene_index` (photo index) |
| `demo_load_error` | Once per allowlisted error code per mount; `error_code=viewer_unavailable/viewer_load_failed/panorama_load_failed/fullscreen_unavailable` |
| `demo_return_to_website` | Visit ArchWalk header CTA clicked |
| `demo_cta_click` | Validated demo link clicked on any eligible marketing page; allowlisted `cta_placement` and normalized `source_page` pathname |
| `blog_demo_click` | Also retained for blog demo links; safe `article_slug` (or `index`) and `cta_placement` |
| `generate_lead` | Existing confirmed successful demo-request submission only; no submitted fields |

CTA placements: `article_inline`, `article_end`, `article_body`, `index`, `navigation`, `hero`, `footer`, `body`. Explicit known placement attributes take priority, with safe DOM-context fallbacks. Known public demo entry query/anchors are validated; no destination URL is sent.

The demo reuses AW360-016 source `archwalk360`, version `1`, and its existing flat message schemas. Origin must match the configured iframe origin, source must equal the actual iframe Window, and message type, exact keys and payload values must validate before projection. Ready requires positive count and in-range integer index. Unknown messages, added keys, invalid codes/kinds, resize and heartbeat are ignored. An iframe load only sends the existing init handshake; it never means a rendered panorama. State resets on each iframe remount, while page views/open events have page-visit scope. Readiness and interactions occurring before acceptance are not replayed as historical engagement.

## Automated verification

Marketing: `pnpm exec tsx --test tests/marketing-analytics.test.ts tests/analytics-runtime.test.ts`, plus existing marketing and AW360 embed tests. Demo: `pnpm test` (cross-platform test discovery), plus `pnpm exec playwright test tests/e2e/listing-media.spec.ts --project=listing-chromium` for existing gallery, keyboard, iframe and immersive behavior. Run `pnpm lint`, `pnpm exec tsc --noEmit`, and `pnpm build` in each repository.

For cross-application browser verification, build both apps with the measurement ID and build marketing with `NEXT_PUBLIC_API_BASE=https://api.archwalk.app` so HTTPS aliases do not block requests to a local HTTP API as mixed content, start marketing on 3030 and demo on 3031, then run `node tests/demo-analytics.browser.mjs` in marketing or `node tests/analytics.browser.mjs` in demo. Override `ANALYTICS_TEST_MARKETING_URL` / `ANALYTICS_TEST_DEMO_URL` for different local servers. The harness maps HTTPS production aliases onto local production servers, serves a controlled iframe bridge fixture, loads the real Google script, and intercepts all GA collection so test visits never reach the property. It checks real shared GA client/session identifiers, invalid messages, lifecycle dedupe, photo/tour remounts, fullscreen transitions and cross-domain withdrawal. It requires network access to Google's script. The live script currently enables automatic measurement, so the harness disables Enhanced Measurement only in its intercepted local script response to simulate the required release configuration. It fails if the expected script configuration shape changes. This does not alter live GA4 settings; the owner must still make and verify the coordinated changes above. `node tests/marketing-analytics.browser.mjs` retains focused consent-card accessibility, real Next navigation and confirmed-lead regressions.

## Realtime / DebugView after approved release

1. Use a clean browser on `https://archwalk.app/blog`, decline first and verify no Google requests. Reopen Cookie preferences with the keyboard, review both-domain scope, then accept. Expect one sanitized `page_view` and one script request.
2. Follow a demo CTA: expect `demo_cta_click` plus `blog_demo_click` on a blog page. Open demo with `?tour=1#rooms`; verify no new prompt and a sanitized `/viewer` view, `demo_open`, and one tour start. Check GA requests have the same `cid` and `sid` across hosts.
3. Wait for actual viewer ready, interact, change scenes, enter/exit fullscreen, switch photos/tour twice. Expect the event rules above; no initialization engagement, duplicate lifecycle events, or query/hash pageviews. Verify credits navigation sends one new page view.
4. Inspect Network collect payloads for labels, tokens, query/hash and private referrers (none should appear). Verify excluded hosts/routes and embedded marketing remain silent, including private client navigation followed by Back.
5. Withdraw on demo; verify GA cookies clear and collection is disabled on the open marketing tab within its next active check. Repeat withdrawal in the other direction. Reload and confirm denial persists.
6. In GA4 Reports > Realtime compare hostnames, paths and event counts. For DebugView use a GA debugging browser extension in a dedicated verification session; this integration never enables `debug_mode` for normal users. In Admin > DebugView confirm safe parameters and event order. Register event-scoped custom dimensions such as `demo_type`, `cta_placement`, `source_page`, `interaction_kind`, `error_code`, `fullscreen_mode`, and numeric `scene_index` as needed.

Source tests cannot verify GA dashboard configuration, live ingestion, real museum rendering, or frame-rate budgets on physical mobile devices. The fixture covers transport and host behavior without modifying the core viewer runtime or embed contract. Perform the release checks above and a real museum/mobile smoke test after review.
