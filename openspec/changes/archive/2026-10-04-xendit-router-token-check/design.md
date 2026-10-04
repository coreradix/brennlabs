## Context

See `proposal.md` for motivation. Current state: `src/pages/api/webhooks/xendit.ts` reads `x-callback-token` and forwards it but never compares it; the archived spec (`xendit-webhook-routing`) explicitly says the router SHALL NOT verify. The `XENDIT_WEBHOOK_TOKEN` secret already exists in the Worker runtime (production set; local dev via `.dev.vars`). Astro 7 + `@astrojs/cloudflare@14` exposes it via `import { env } from 'cloudflare:workers'`.

## Goals / Non-Goals

**Goals:**
- Reject spoofed webhooks at the router before spending a brand subrequest.
- Fail closed when the secret is missing so misconfiguration is loud, not open.
- Keep brand-side verification untouched (defense in depth).

**Non-Goals:**
- Timing-safe comparison ("constant-time") — plain `===` is accepted; the token is a high-entropy bearer secret compared once per webhook, not a password oracle.
- Per-brand tokens or token rotation mechanics — single shared token stands.
- Changing routing, forwarding, timeout, or log behavior on the verified path.

## Decisions

- **Verify-first, before body parsing.** The token check runs at the top of `POST`, ahead of `request.text()`/JSON parsing. Rationale: junk is rejected with minimum work; a malformed body with a bad token reports `401` (auth first), which is the correct signal. Alternative (parse-then-verify) rejected — it does wasted work and muddles the error contract.
- **Read via `import { env } from 'cloudflare:workers'` (`env.XENDIT_WEBHOOK_TOKEN`).** This is the documented API for this adapter version; the older `Astro.locals.runtime.env` path is removed in v13+. Alternative rejected for that reason.
- **Fail closed with `500 TOKEN_NOT_CONFIGURED` when the secret is empty/unset.** An open router on secret misconfiguration would silently downgrade security; a 500 pages attention and Xendit retries. Local dev must set `.dev.vars` + `wrangler types` refresh (noted in tasks).
- **Keep forwarding the verified token.** Brands keep verifying independently, so a compromised router alone cannot mint trust — the brand still checks. No header stripping, no replacement.
- **Log rejections as `console.warn` with reason (`invalid_token`, `token_not_configured`), never log token values.** Consistent with existing log conventions; avoids secret leakage into Worker logs.

## Risks / Trade-offs

- [Risk] Secret missing in one environment (e.g., preview) turns all webhooks into 500s → Mitigation: fail-closed is intentional; deploy checklist includes verifying the secret per environment, and the log reason names it directly.
- [Risk] Xendit rotates the dashboard token but Worker secret lags → 401s on legitimate traffic → Mitigation: update via `wrangler secret put` + redeploy is a one-minute fix; logs distinguish `invalid_token` from routing errors.
- [Risk] `===` comparison leaks timing info in theory → Mitigation: accepted; single comparison per request on a bearer token is not a practical oracle, and `workerd` offers no constant-time helper worth importing.

## Migration Plan

1. Confirm `XENDIT_WEBHOOK_TOKEN` is set in production (already done) and add it to `.dev.vars` locally.
2. Deploy; send one legitimate + one bad-token test POST; confirm 2xx-forward vs 401 and the warn logs.
3. Rollback: revert the verify-first block (single hunk); router returns to passthrough behavior. No data migration involved.

## Open Questions

- None.
