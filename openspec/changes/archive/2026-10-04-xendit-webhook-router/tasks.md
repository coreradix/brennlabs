## 1. Router Endpoint

- [x] 1.1 Create `src/pages/api/webhooks/xendit.ts` as `prerender = false` POST-only `APIRoute` with hardcoded prefix map (`H` -> Himagsikan URL) and verify `npm run build` succeeds with the route built as a server entrypoint.
- [x] 1.2 Implement body handling: read raw text, parse JSON, extract `data.reference_id` and derive prefix via `split("-")[0]`, returning `400` on malformed JSON and `200` + error code on missing/unknown prefix without forwarding, verified via `curl` against `npm run dev` for each case.
- [ ] 1.3 Implement await-forward with 10s `AbortSignal.timeout`: POST raw body to brand URL forwarding `Content-Type` and `x-callback-token`, return brand 2xx through and map brand non-2xx/network/timeout to `502`, verified via `curl` POSTs with stubbed brand responses.

## 2. Observability and Verification

- [x] 2.1 Add per-request Worker logs (`reference_id`, prefix, target host or unrouted reason, downstream status, latency ms) via `console.log`/`console.warn` and verify lines appear in `npm run preview` (wrangler dev) output for routed, unknown-prefix, and brand-failure cases.
- [ ] 2.2 Run full production build and end-to-end check: `npm run build` passes and a POST to `/api/webhooks/xendit` with sample `H-` reference routes to the configured brand URL, verified via logs and brand receipt.
