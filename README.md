# ArchWalk 360 reference application

This is a small fictional property platform (Reference Realty) with ArchWalk 360
embedded as a capability, not as ArchWalk Manager.

- `/editor` — seller workspace with the embedded Creator (`Sunset Villa`)
- `/viewer` — customer marketplace listing with Photos ↔ 360° Tour
- `/plugin` — Blue Lagoon resort dashboard: 200 imported rooms → 8 visual variants → 8 ArchWalk Experiences, with Embedded Creator on the same page
- `/plugin/rooms/101` — guest room page for a physical room (101 and 102 share Deluxe King)
- `/` redirects to `/editor`

Sunset Villa uses external key `sunset-villa-001`. Blue Lagoon variants use
`external_customer_id=blue_lagoon` and `external_resource_id=room_type_<variant>`.
There is no database, partner authentication, or CMS.

## Running locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev --port 3001
```

Open [http://localhost:3001](http://localhost:3001).

## Environment

Server-side only (never prefix these with `NEXT_PUBLIC_`):

| Variable | Purpose |
|---|---|
| `ARCHWALK_API_BASE` | Partner API host, no trailing slash |
| `ARCHWALK_APP_ORIGIN` | ArchWalk app origin for Creator/Viewer iframes |
| `AW360_API_KEY` | Partner API key (`aw360_sk_…`) |
| `APP_ORIGIN` | This app’s origin (`http://localhost:3001` locally), used when minting Creator sessions |

Local topology:

- ArchWalk backend: `8000`
- ArchWalk Creator / Viewer: `3000`
- This Reference App: `3001` → [http://localhost:3001/plugin](http://localhost:3001/plugin)

`AW360_API_KEY` stays on the Next.js server. Browser JS only receives Experience/publication data and short-lived Creator session tokens for the iframe handshake.

Opening `/plugin` automatically create-or-resolves one Experience per visual variant. There is no “create 8 Experiences” button.

## ArchWalk setup

1. Enable ArchWalk 360 for the Organization and create an Integration.
2. Set media policy to `managed_only` or `both` (this app uses Creator-managed uploads).
3. Add this app’s exact origin (`APP_ORIGIN`) to Integration allowed origins.
4. Issue a Partner API credential with at least: `experiences:read`, `experiences:write`, `experiences:publish`, `panoramas:read`, `panoramas:write`, `panoramas:upload`, `creator_sessions:issue`.
5. Store the raw key immediately; it is shown once.

To reuse Sunset Villa content already created in ArchWalk, open that Standalone Experience in the Organization's `/archwalk-360` library and choose **Connect to integration**. Select this Integration and enter the exact external resource ID `sunset-villa-001` (the listing key in `src/lib/property.ts`). This binds the same Experience; its Panoramas, draft, publication, and `public_id` remain in place. Opening `/editor` then resolves it through the normal Partner create-or-resolve call and the embedded Creator loads its existing Panoramas. The `/viewer` listing keeps the same published public Viewer. If no Experience was connected under that key, the reference app can still create one through the Partner API.

Blue Lagoon room types use the same Connect flow with `external_resource_id` values such as `room_type_deluxe_king` and customer `blue_lagoon`. Rooms 101 and 102 both resolve that Deluxe King identity.

## Tests

```bash
pnpm test
```

## Embedding layout

The partner controls iframe width, height, surrounding layout, and where the
Viewer appears. ArchWalk supplies the embedded Creator runtime. This reference
editor demonstrates a spacious integration, rather than requiring partners to
use the same host layout: readable intro copy, a workspace up to 1536px wide with
20–32px gutters, and an iframe sized to `100dvh - 6rem` (minimum 860px for
the stacked mobile editor, or 720px on larger screens). The ready iframe has no surrounding card or status footer.

Keep `allow="fullscreen"` and `allowFullScreen` on the Creator iframe so its
immersive editor can use native fullscreen. Unsupported browsers retain the
expanded preview inside the partner-sized iframe. No cross-origin DOM height
inspection is used.

## Customer listing media

`/viewer` starts with local photos. A published tour adds a **360° Tour** option
that replaces the gallery in the same media area; the customer stays in the host
product. The Viewer’s own fullscreen control expands its iframe and returns to
the listing on exit. Returning to Photos unmounts the Viewer to free rendering
resources. Unpublished, unconfigured or unavailable tours leave a photo-only listing.

Demo photos in `public/property/` are rectilinear stills of the same ArchWalk-owned
`ArchWalk/public/pano1.jpg` demo panorama (the higher-resolution source of the
marketing `landing/hero-panorama.webp`), not separate
properties or private/customer photographs. Rebuild them with
`node scripts/prepare-property-photos.mjs /path/to/pano1.jpg`.

Install Chromium once with `pnpm exec playwright install chromium`.
Browser checks: `pnpm test:e2e`. Real local smoke: `pnpm test:integration` with this
app on `localhost:3001`, ArchWalk on `localhost:3000`, and Sunset Villa published
under the existing registered integration/origin. These checks perform no writes.
