import type { APIRoute } from "astro";

export const prerender = false;

const BRAND_WEBHOOKS: Record<string, string> = {
  H: "https://game-server.himagsikan.online/billing/webhook",
};

const FORWARD_TIMEOUT_MS = 10_000;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function methodNotAllowed() {
  return new Response(
    JSON.stringify({ ok: false, code: "METHOD_NOT_ALLOWED" }),
    {
      status: 405,
      headers: { "Content-Type": "application/json", Allow: "POST" },
    },
  );
}

export const GET: APIRoute = () => methodNotAllowed();
export const PUT: APIRoute = () => methodNotAllowed();
export const PATCH: APIRoute = () => methodNotAllowed();
export const DELETE: APIRoute = () => methodNotAllowed();
export const OPTIONS: APIRoute = () => methodNotAllowed();
export const HEAD: APIRoute = () => methodNotAllowed();

export const POST: APIRoute = async ({ request }) => {
  const startedAt = Date.now();
  const raw = await request.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("[xendit-router] malformed_json");
    return json({ ok: false, code: "MALFORMED_JSON" }, 400);
  }

  const referenceId =
    typeof parsed === "object" && parsed !== null
      ? (parsed as { data?: { reference_id?: unknown } }).data?.reference_id
      : undefined;

  if (typeof referenceId !== "string" || referenceId.length === 0) {
    console.warn("[xendit-router] missing_reference_id");
    return json({ ok: false, code: "MISSING_REFERENCE_ID" }, 200);
  }

  const prefix = referenceId.split("-")[0];
  const target = BRAND_WEBHOOKS[prefix];

  if (!prefix || !target) {
    console.warn(
      `[xendit-router] unknown_prefix reference_id=${referenceId} prefix=${prefix || "(none)"}`,
    );
    return json(
      { ok: false, code: "UNKNOWN_PREFIX", reference_id: referenceId },
      200,
    );
  }

  const contentType = request.headers.get("content-type") ?? "application/json";
  const callbackToken = request.headers.get("x-callback-token");

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        ...(callbackToken ? { "x-callback-token": callbackToken } : {}),
      },
      body: raw,
      signal: AbortSignal.timeout(FORWARD_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - startedAt;
    const upstreamBody = await upstream.text();

    if (upstream.ok) {
      console.log(
        `[xendit-router] routed prefix=${prefix} target=${target} status=${upstream.status} latency_ms=${latencyMs} reference_id=${referenceId}`,
      );
      return new Response(upstreamBody, {
        status: upstream.status,
        headers: {
          "Content-Type":
            upstream.headers.get("content-type") ?? "application/json",
        },
      });
    }

    console.warn(
      `[xendit-router] brand_failed prefix=${prefix} target=${target} brand_status=${upstream.status} latency_ms=${latencyMs} reference_id=${referenceId}`,
    );
    return json(
      {
        ok: false,
        code: "BRAND_FORWARD_FAILED",
        brand_status: upstream.status,
      },
      502,
    );
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const timedOut =
      error instanceof DOMException && error.name === "TimeoutError";
    console.warn(
      `[xendit-router] brand_unreachable prefix=${prefix} target=${target} latency_ms=${latencyMs} reference_id=${referenceId} error=${timedOut ? "timeout" : "fetch_failed"}`,
    );
    return json(
      { ok: false, code: timedOut ? "BRAND_TIMEOUT" : "BRAND_UNREACHABLE" },
      502,
    );
  }
};
