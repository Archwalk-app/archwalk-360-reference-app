# Demo analytics implementation and validation

Status: implemented on separate local `feature/demo-analytics` branches in both repositories. Not pushed, merged or deployed. Live GA4 settings were not changed.

## Implementation

Both applications reuse property `561759115` and measurement ID `G-MZYPJQTCPJ`, with production hostname restrictions, advertising disabled, explicit sanitized page views, and a synchronous private-navigation opt-out that lasts for the document. Query and hash changes are never new page views, and private referrers are always blank.

A new first-party v2 preference explicitly covers marketing and demo before sharing it. Old localStorage grants are ignored. Both public surfaces offer accessible preferences and privacy links. Withdrawal is checked across open tabs by cookie polling and focus/visibility checks, and synchronously before each application event. Refused cookie writes fail closed. Existing GA identifiers survive hydration so marketing-to-demo client/session continuity is preserved.

The demo mounts analytics in its root layout but initializes only on `/viewer` and `/viewer/credits` at `demo.archwalk.app`. Its AW360-016 receiver validates the actual iframe Window, configured origin, source, version, exact event keys and payload values, then projects only allowlisted fields. Ready is separate from iframe load; initialization, resize and heartbeat never count as engagement. Lifecycle and engagement dedupe per iframe mount; page visits remain independent. Core panorama runtime and embedding contracts are unchanged.

Marketing delegates validated demo links across its eligible pages to `demo_cta_click` with safe placement and source pathname. Blog demo and confirmed lead events remain compatible. The privacy disclosure, README, production environment examples and release instructions are updated. The demo test command now expands files portably on Windows; generated Next test output is excluded from lint, and two pre-existing unescaped apostrophes in plugin copy were corrected without changing the displayed text.

## Events and required release configuration

See the [analytics guide and complete event/trigger table](analytics.md#event-definitions), including all ten demo events, `demo_cta_click`, retained `blog_demo_click` / `generate_lead`, and manual `page_view`.

Set the measurement ID for production builds only (including Vercel Production for demo), keep preview collection off, and coordinate both releases. **Before the approved rollout, the GA owner must disable Enhanced Measurement page views/history and the other automatic measurements described in the guide.** The live Google script still enabled history tracking during testing; the browser harness simulates the required settings only in its local intercepted script response. All GA collection is intercepted, so no test visits populate the property. Deployment order, rollback considerations and Realtime/DebugView checks are documented in the guide. No live configuration or deployment was performed.

## Validation results

| Check | Result |
| --- | --- |
| Marketing analytics, runtime, embed, blog and marketing routing unit suites | 67 passed |
| Demo complete unit suite | 35 passed |
| Existing gallery / keyboard / desktop and mobile immersive browser regressions | 3 passed |
| Cross-application production browser analytics harness | Passed: consent lifecycle, no tag before consent, actual shared GA `cid` and `sid`, sanitized views, direct tour entry, credits navigation, trusted bridge events, invalid messages, dedupe, photo/tour remounts, fullscreen entry/exit and withdrawal in both directions |
| Existing focused marketing production browser harness | Passed: three consent-card viewport sizes, keyboard focus, persistence, real Next navigation, private-route latch, preview/local/frame exclusion, withdrawal, failed submissions and confirmed lead without form leakage |
| Marketing lint | Passed, 0 errors; 42 pre-existing warnings |
| Demo lint | Passed, 0 errors or warnings |
| Both TypeScript checks | Passed (`tsc --noEmit`; production builds also typechecked) |
| Both production builds | Passed; final isolated output `.next-e2e-analytics-build`; marketing CSS verification passed for 4 public pages |

Marketing command: `pnpm exec tsx --test tests/marketing-analytics.test.ts tests/analytics-runtime.test.ts tests/archwalk-360-embed.test.ts tests/blog.test.tsx tests/marketing-routing.test.tsx`.

Demo commands: `pnpm test` and `pnpm exec playwright test tests/e2e/listing-media.spec.ts --project=listing-chromium`.

Browser commands: `node tests/demo-analytics.browser.mjs` and `node tests/marketing-analytics.browser.mjs` from marketing, with both production servers running. The cross-app harness is also copied to demo as `node tests/analytics.browser.mjs`. See the guide for public environment variables and local HTTPS host aliases. The legacy lead harness needed its HTTPS API test build setting and a wait for initial GA initialization before testing framing; both now pass.

Next.js 16.4.3 reported an existing security advisory and initially stopped the marketing build. The documented retry succeeded while retaining the upgrade warning. Upgrading Next.js is recommended as a separate security follow-up; dependency versions were not changed here. Sentry also reported its existing missing-auth-token release warning; these local builds did not publish a Sentry release.

## Remaining limitations

- The GA owner must apply and verify the coordinated stream settings. Local tests cannot certify production dashboard configuration or actual Realtime/DebugView ingestion.
- Old open v1 documents must reload to run shared withdrawal logic. Background timer throttling can delay checks on inactive tabs, and requests already in flight cannot be recalled. Host-only legacy cookies on a sibling domain clear when that host checks or is visited.
- Real museum rendering, native fullscreen on physical mobile devices and measured frame-rate/bundle budgets still need a production smoke test. The existing desktop/mobile interaction regressions pass; analytics adds no dependency or core viewer-runtime change.
- Campaign attribution work remains separate: queries and referrers are deliberately omitted. Keep the mirrored runtime implementations synchronized across these independent repositories.

## Changed files

### ArchWalk

- `.env.example`
- `README.md`
- `app/privacy/page.tsx`
- `components/marketing/public-analytics.tsx`
- `docs/demo-analytics-implementation.md`
- `docs/ga4.md`
- `lib/analytics-policy.ts`
- `lib/analytics-runtime.ts`
- `lib/marketing-analytics.ts`
- `lib/marketing.ts`
- `next.config.ts`
- `tests/analytics-runtime.test.ts`
- `tests/demo-analytics.browser.mjs`
- `tests/marketing-analytics.browser.mjs`
- `tests/marketing-analytics.test.ts`
- `tests/marketing-routing.test.tsx`

### archwalk-360-reference-app

- `.env.example`
- `README.md`
- `docs/analytics.md`
- `docs/demo-analytics-implementation.md`
- `eslint.config.mjs`
- `next.config.ts`
- `package.json`
- `scripts/test.mjs`
- `src/app/demo-analytics.tsx`
- `src/app/layout.tsx`
- `src/app/plugin/plugin-workspace.tsx`
- `src/app/plugin/rooms/[room]/page.tsx`
- `src/app/viewer/listing-media.tsx`
- `src/app/viewer/museum-header.tsx`
- `src/app/viewer/viewer-embed.tsx`
- `src/lib/analytics-policy.ts`
- `src/lib/analytics-runtime.ts`
- `src/lib/archwalk/analytics-runtime.test.ts`
- `src/lib/archwalk/demo-engagement.test.ts`
- `src/lib/archwalk/protocol.ts`
- `src/lib/demo-analytics.ts`
- `src/lib/demo-engagement.ts`
- `tests/analytics.browser.mjs`
