## 1. Token Verification

- [x] 1.1 Add verify-first block to `POST` in `src/pages/api/webhooks/xendit.ts`: read `XENDIT_WEBHOOK_TOKEN` via `cloudflare:workers` env, return `401 INVALID_TOKEN` on missing/mismatch and `500 TOKEN_NOT_CONFIGURED` when the secret is unset, before any body parsing or forwarding, and verify `npm run build` succeeds.
- [x] 1.2 Cover the three token paths with `curl` against local dev (`.dev.vars` set): valid token proceeds to routing, bad/missing token returns `401` with no outbound fetch, unset secret returns `500` with no outbound fetch, verified via responses plus `invalid_token` / `token_not_configured` warn logs.

## 2. Verification

- [ ] 2.1 Confirm no regression on the verified path: valid-token POST with an `H-` reference still forwards raw body + token to the brand and logs as before, verified via `curl` and Worker logs.
