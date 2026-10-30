# Hallwyl Museum showcase

`/viewer` is the independent **Rooms in Time** exhibition. `/editor` edits only the existing Hallwyl Experience; it does not create-or-resolve or overwrite Experiences. `/plugin` remains the separate Blue Lagoon demonstration with its existing identities and behavior.

Hallwyl’s production mapping was verified read-only: Item ID `sunset-villa-001`, Experience `166ac0f6-28c0-4858-92fc-f06243b0becc`, public ID `1e00029c-d4ff-4a22-8d5b-c95d10ae3f57`, no customer scope. Configure `HALLWYL_ITEM_ID` server-side if the connected ID changes; set `HALLWYL_CUSTOMER_ID` only for a customer-scoped connection. Incorrect mappings produce a non-destructive setup state. The public exhibition embeds the verified published public ID without requiring a Partner secret.

## Server configuration

- `HALLWYL_API_BASE=https://api.archwalk.app`
- `HALLWYL_APP_ORIGIN=https://archwalk.app`
- `HALLWYL_API_KEY`: the existing Hallwyl Integration’s server-side production credential, never `NEXT_PUBLIC_*`
- `APP_ORIGIN=https://archwalk-360-reference-app.vercel.app` in Vercel; the exact local origin for local Creator testing must also be registered by the owner
- `HALLWYL_ITEM_ID=sunset-villa-001`; leave `HALLWYL_CUSTOMER_ID` unset for the verified mapping

The credential needs `experiences:read`, `creator_sessions:issue` and the existing Creator action subset: `experiences:write`, `experiences:publish`, `panoramas:read`, `panoramas:write`, `panoramas:upload`. No credentials belong in Git. Vercel settings/deployment are owner-managed. `HALLWYL_VIEWER_ORIGIN` is an optional test-only Viewer origin override; production defaults to `https://archwalk.app`.

## Local development

`pnpm install`, configure an untracked `.env`, then `pnpm dev --port 3001`. The home route opens `/viewer`. Do not open `/plugin` against production just to test Hallwyl: the separate plugin intentionally create-or-resolves its Blue Lagoon inventory.

## Photographs

Four optimized WebP perspectives were derived from the prepared Hallwyl panorama package, matching the actual tour. Source photographs: **Jan Ainali, CC BY-SA 4.0**. Derivatives retain that licence. Individual source URLs, source checksums, licence links and modifications: `public/museum/credits.json` and `/viewer/credits`. Reproduce with `node scripts/prepare-museum-photos.mjs /path/to/ArchWalk-Demo-Assets`. No full panoramas or massive originals are committed.

History and room facts use the museum’s linked official room guide and house history. No official sponsorship, ticketing, opening hours or booking function is implied.

## Blue Lagoon configuration stays separate

Keep the existing `ARCHWALK_API_BASE`, `ARCHWALK_APP_ORIGIN` and `AW360_API_KEY` values for Blue Lagoon. Hallwyl-specific overrides take precedence only for the museum editor; legacy global values remain a fallback for existing single-integration setups. Do not replace a Blue Lagoon key with a Hallwyl key when configuring Vercel. Blue Lagoon keeps `external_customer_id=blue_lagoon` and `external_resource_id=room_type_<variant>`.

## Existing embedding behavior

Both iframes retain `allow="fullscreen"` and `allowFullScreen`. The Creator handshake passes only its short-lived session token to the trusted iframe origin, never in its URL. The partner host controls the iframe footprint; this change does not remount or modify the ArchWalk runtime. Photos unmount the Viewer iframe to release rendering resources.
