## Why

The Xendit router currently forwards any POST to brand billing endpoints without verifying the caller — the `x-callback-token` header is passed through but never checked against the `XENDIT_WEBHOOK_TOKEN` Worker secret. Anyone who discovers the router URL can trigger forwarded traffic at brand endpoints (which reject it, but only after the router has spent a subrequest). Verifying at the router closes that gap at the edge.

## What Changes

- Verify the incoming `x-callback-token` header against the `XENDIT_WEBHOOK_TOKEN` Worker secret before any parsing or forwarding.
- Return `401` with an error payload (no forwarding) when the token is missing or does not match.
- Return `500` with an error payload (no forwarding, fail closed) when the secret itself is unconfigured in the runtime.
- Keep forwarding the verified token to the brand unchanged so brands continue verifying independently (defense in depth).
- Document the local-dev requirement (`.dev.vars` + `wrangler types` refresh).

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `xendit-webhook-routing`: add router-side token verification ahead of prefix routing; previously passthrough-only with no router check.

## Impact

- Affected code: `src/pages/api/webhooks/xendit.ts` (verify-first block at the top of `POST`); no changes to routing, forwarding, timeout, or logging behavior on the verified path.
- APIs: **BREAKING** for unauthenticated callers — requests without a valid `x-callback-token` now get `401` instead of being forwarded. Legitimate Xendit traffic is unaffected (Xendit always sends the token).
- Dependencies/systems: no new npm dependencies; reads the existing `XENDIT_WEBHOOK_TOKEN` secret via `cloudflare:workers` env. Requires the secret to be set in every environment (production already set; local needs `.dev.vars`).
