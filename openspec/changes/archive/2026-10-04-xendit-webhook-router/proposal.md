## Why

BrennLabs operates multiple brands under one company website but uses a single shared Xendit account. Xendit allows only one webhook URL per account, so brand-specific billing endpoints (e.g. Himagsikan) cannot each receive webhooks directly. A single router endpoint on the portal solves this by inspecting the caller-controlled `reference_id` prefix and forwarding to the owning brand.

## What Changes

- Add `POST /api/webhooks/xendit` Astro server endpoint (`prerender = false`) running on the existing Cloudflare Worker.
- Parse `data.reference_id` from the Xendit JSON body, derive the brand prefix via `split("-")[0]`, and forward the raw body to the matching brand webhook URL from a hardcoded prefix map.
- Forward `Content-Type` and `x-callback-token` passthrough; await the brand response with an explicit timeout and propagate brand failures to Xendit.
- Return `200` with an error payload for unknown/missing prefixes (no Xendit retry), `405` for non-POST, `400` for invalid JSON, `502` for brand failure/timeout.
- Emit per-request Worker logs (prefix, target, status, latency).

## Capabilities

### New Capabilities
- `xendit-webhook-routing`: single Xendit webhook entrypoint that routes by `reference_id` prefix to brand-owned webhook endpoints with passthrough auth, await-forward semantics, and structured outcomes.

### Modified Capabilities
- None.

## Impact

- Affected code: new file `src/pages/api/webhooks/xendit.ts` (+ prefix map); no changes to existing pages or `src/pages/api/hello.ts` test endpoint.
- APIs: new public webhook URL to register once in the Xendit dashboard; brand endpoints (e.g. `https://himagsikan.online/billing/webhook`) become downstream receivers.
- Dependencies/systems: no new npm dependencies (uses global `fetch`, `Response`); relies on existing `@astrojs/cloudflare` SSR runtime. Brand endpoints must continue verifying `x-callback-token` since the router does not verify.
