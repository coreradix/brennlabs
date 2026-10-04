## Context

See `proposal.md` for motivation. Current state: Astro 7 + `@astrojs/cloudflare` Worker, static output with on-demand endpoints via `export const prerender = false` (proven by `src/pages/api/hello.ts`). One shared Xendit account/token across all brands; brand endpoints (starting with `https://himagsikan.online/billing/webhook`) verify `x-callback-token` themselves. No new dependencies allowed; must run within Cloudflare Workers runtime (Web `fetch`/`Request`/`Response` only).

## Goals / Non-Goals

**Goals:**
- One webhook URL registered in Xendit that fans out to N brand URLs by `reference_id` prefix.
- Await-forward semantics so Xendit retries only when the brand actually failed.
- No-retry swallow for unroutable events so a bad prefix does not retry forever.
- Per-request logs sufficient to trace money movement in Worker logs.

**Non-Goals:**
- Router-side `x-callback-token` verification (passthrough only; brands verify).
- Retry queues, persistence, or DLQ — Xendit retries on 5xx are the retry mechanism.
- Admin UI or runtime config for the prefix map; hardcoded map is accepted for v1.
- Signature/HMAC verification, idempotency store, or payload transformation.

## Decisions

- **Endpoint location: `src/pages/api/webhooks/xendit.ts` (POST, `prerender = false`).** Follows the existing `src/pages/api/*.ts` + `APIRoute` pattern; keeps the public path `/api/webhooks/xendit` stable for the Xendit dashboard. Alternative considered: top-level `/api/xendit.ts` — rejected because the `/webhooks/` namespace leaves room for future providers.
- **Hardcoded `Record<string, string>` prefix map in the endpoint file (initial: `{ H: "https://himagsikan.online/billing/webhook" }`).** Simplest option per user choice; adding a brand is a one-line edit + redeploy. Alternatives (env vars, KV `SESSION`) rejected for v1 to avoid config-plumbing overhead for 2–3 brands.
- **Prefix rule: `reference_id.split("-")[0]`, exact case-sensitive match.** Supports single (`H`) and multi-char (`HIM`) uppercase prefixes with zero config. Alternative regex `^([A-Z]+)-` considered — equivalent strictness, but plain `split` is clearer and tolerates future alphanumeric prefixes without change.
- **Forward raw body text via `await request.text()`, not `JSON.stringify`.** Guarantees the brand sees byte-identical payload (protects against key reorder/whitespace changes if brands ever add body signatures). Only `Content-Type` (fallback `application/json`) and `x-callback-token` (if present) are forwarded; no other headers leak through.
- **Await + `AbortSignal.timeout(10_000)`, propagate failures as 502.** Await chosen per user requirement; 10s keeps well under Xendit's caller timeout and Worker subrequest limits while failing fast on hung brands. Returning the brand's 2xx body/status on success preserves brand semantics; mapping brand 5xx/network/timeout to `502` triggers Xendit retry. Alternative fire-and-forget (`waitUntil`) rejected — user explicitly wants await.
- **Unknown/missing prefix returns `200` with `{ ok: false, code }`, no forward.** Deliberate asymmetry: brand failures retry (502), routing failures do not (200). Prevents infinite Xendit retry storms on events that can never route. `MALFORMED_JSON` still returns 400 since that indicates sender error worth retrying/fixing.
- **Method guard: only POST, else `405` with `Allow: POST`.** Xendit only sends POST; anything else is a probe or misconfiguration.
- **Logging: `console.log` routed (prefix, target host, downstream status, ms), `console.warn` unrouted/failed.** Zero-dependency, visible in `wrangler tail` and Cloudflare dashboard. No PII beyond `reference_id` (caller-generated opaque ID, already in the URL-safe payload).

## Risks / Trade-offs

- [Risk] Spoofed POSTs to the router get forwarded (router does not verify token) → Mitigation: brands still verify `x-callback-token`; router forwards junk that brands reject and logs it. Acceptable for v1; add router-side token check later if abuse appears.
- [Risk] Slow brand holds the Worker subrequest open until Xendit times out → Mitigation: 10s abort converts hangs to fast 502s, which Xendit retries.
- [Risk] Brand returns 4xx for a permanently bad event → router 502 causes useless retries → Mitigation: logged and visible; revisit mapping (e.g., pass through 4xx as 200) once real brand error shapes are known.
- [Risk] Hardcoded map requires redeploy per brand → Mitigation: acceptable for a handful of brands; migrate to env/KV when brand onboarding frequency justifies it.
- [Risk] `reference_id` without `-` or wrong case never routes (returns 200 + warn) → Mitigation: log includes the raw `reference_id` so mis-prefixed sends are diagnosable; document the `PREFIX-uuid` contract where reference IDs are created.

## Migration Plan

1. Deploy portal with the new endpoint (no traffic impact; old brand URLs untouched).
2. Register `https://<portal-domain>/api/webhooks/xendit` once in the Xendit dashboard.
3. Send a test event per prefix from Xendit dashboard; confirm Worker log + brand receipt.
4. Rollback: point Xendit dashboard back to the brand URL directly; router is stateless so no data migration.

## Open Questions

- None blocking. Deferrable: whether brand 4xx should map to 200 instead of 502 (decide after observing real brand error responses); whether to add router-side token verification if spoof traffic appears.
