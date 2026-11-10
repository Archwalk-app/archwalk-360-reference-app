# ArchWalk 360 reference demo

`/viewer` is the independent **Hallwyl Museum** exhibition, presented as an **ArchWalk 360** reference showcase. `/editor` edits only the existing Hallwyl Experience; it does not create-or-resolve or overwrite Experiences. `/plugin` is a **private Zesora Nathia Gali integration concept**, not an official hotel integration. It uses publicly listed room-type names with nine visual variants and 18 explicitly fictional sample room IDs. No real Zesora inventory or photographs are represented as connected.

Hallwyl’s production mapping was verified read-only: Item ID `sunset-villa-001`, Experience `166ac0f6-28c0-4858-92fc-f06243b0becc`, public ID `1e00029c-d4ff-4a22-8d5b-c95d10ae3f57`, no customer scope. Configure `HALLWYL_ITEM_ID` server-side if the connected ID changes; set `HALLWYL_CUSTOMER_ID` only for a customer-scoped connection. Incorrect mappings produce a non-destructive setup state. The public exhibition embeds the verified published public ID without requiring a Partner secret.

## Server configuration

- `HALLWYL_API_BASE=https://api.archwalk.app`
- `HALLWYL_APP_ORIGIN=https://archwalk.app`
- `HALLWYL_API_KEY`: the existing Hallwyl Integration’s server-side production credential, never `NEXT_PUBLIC_*`
- `APP_ORIGIN=https://archwalk-360-reference-app.vercel.app` in Vercel; the exact local origin for local Creator testing must also be registered by the owner
- `HALLWYL_ITEM_ID=sunset-villa-001`; leave `HALLWYL_CUSTOMER_ID` unset for the verified mapping

The credential needs `experiences:read`, `creator_sessions:issue` and the existing Creator action subset: `experiences:write`, `experiences:publish`, `panoramas:read`, `panoramas:write`, `panoramas:upload`. No credentials belong in Git. Vercel settings/deployment are owner-managed. `HALLWYL_VIEWER_ORIGIN` is an optional test-only Viewer origin override; production defaults to `https://archwalk.app`.

## Local development

`pnpm install`, configure an untracked `.env`, then `pnpm dev --port 3001`. The home route opens `/viewer`. The hotel plugin performs **read-only GET lookups** when opened; it creates or resolves only the selected, fictional demo Experience when a signed-in visitor explicitly clicks Edit 360.

## Photographs

Four optimized WebP perspectives were derived from the prepared Hallwyl panorama package, matching the actual tour. Source photographs: **Jan Ainali, CC BY-SA 4.0**. Derivatives retain that licence. Individual source URLs, source checksums, licence links and modifications: `public/museum/credits.json` and `/viewer/credits`. Reproduce with `node scripts/prepare-museum-photos.mjs /path/to/ArchWalk-Demo-Assets`. No full panoramas or massive originals are committed.

History and room facts use the museum’s linked official room guide and house history. No official sponsorship, ticketing, opening hours or booking function is implied.

## Hospitality concept configuration stays separate

Keep `ARCHWALK_API_BASE`, `ARCHWALK_APP_ORIGIN` and `AW360_API_KEY` for the hotel concept; Hallwyl-specific overrides take precedence only for the museum editor. Never replace one integration's key with the other's. All hotel sample identities are namespaced `external_customer_id=zesora_concept_demo`, `external_resource_id=room_type_<variant>`; these are deliberately NOT live customer identities. Crucial: for production, `ARCHWALK_APP_ORIGIN=https://archwalk.app`, NOT `https://demo.archwalk.app`. The reference host has no `/aw360/c/:id` route and will render an embedded 404. A same-origin misconfiguration is now rejected before creating a session; update the server-side environment and redeploy to actually resolve it.

## Existing embedding behavior

Both iframes retain `allow="fullscreen"` and `allowFullScreen`. The Creator handshake passes only its short-lived session token to the trusted iframe origin, never in its URL. The partner host controls the iframe footprint; this change does not remount or modify the ArchWalk runtime. Photos unmount the Viewer iframe to release rendering resources.

## Shared demo access

Set server-only `DEMO_ACCESS_PASSWORD` (at least 12 characters) and an independent random `DEMO_SESSION_SECRET` (at least 32 characters). Generate the secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`; never commit either value. Missing/weak configuration fails closed, including in development. `APP_ORIGIN` must match the browser origin for login and authenticated writes.

One signed HttpOnly session lasts eight hours across both demos. Changing either credential invalidates sessions. Logout clears the browser session. Museum exhibition and credits stay public. Hotel concept inventory refresh is authenticated; its server-to-server inventory lookups are read-only GETs. Creator session and publication actions require authenticated same-origin POSTs; room-page GETs only look up existing Experiences. Login is limited to ten attempts per 15 minutes per trusted hosting IP (one shared bucket locally), with bounded per-instance memory. This is best-effort across serverless instances; use owner-managed platform rate limiting for a distributed limit. No Vercel settings are changed by this implementation.
