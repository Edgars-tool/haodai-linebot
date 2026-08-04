/**
 * line-webhook-worker — Cloudflare Worker-shaped ingress.
 *
 * Responsibilities:
 * - Verify LINE signature (interface)
 * - Normalize events
 * - Forward to assistant-api / queue (injected)
 *
 * Does NOT talk to Hermes. OpenClaw is invoked only via assistant-api domain.
 */
import {
  HmacSha256SignatureVerifier,
  NoopSignatureVerifier,
  parseWebhook,
  type SignatureVerifier,
} from "@haodai/line-events";

export interface WorkerEnv {
  LINE_CHANNEL_SECRET?: string;
  LINE_WEBHOOK_SIGNATURE_REQUIRED?: string;
  ASSISTANT_API_BASE_URL?: string;
  ASSISTANT_API_INTERNAL_TOKEN?: string;
}

export interface ForwardResult {
  status: number;
  body: unknown;
}

export type ForwardFn = (
  path: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<ForwardResult>;

export function createSignatureVerifier(env: WorkerEnv): SignatureVerifier {
  const required =
    (env.LINE_WEBHOOK_SIGNATURE_REQUIRED ?? "false").toLowerCase() === "true";
  if (!required) return new NoopSignatureVerifier();
  if (!env.LINE_CHANNEL_SECRET || env.LINE_CHANNEL_SECRET.startsWith("replace_")) {
    // Refuse insecure "required but missing" configuration
    return {
      verify: () => false,
    };
  }
  return new HmacSha256SignatureVerifier(env.LINE_CHANNEL_SECRET);
}

export async function handleWorkerFetch(
  request: {
    method: string;
    url: string;
    headers: Record<string, string | undefined>;
    text: () => Promise<string>;
  },
  env: WorkerEnv,
  forward: ForwardFn,
): Promise<{ status: number; body: string; headers?: Record<string, string> }> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/health") {
    return {
      status: 200,
      body: JSON.stringify({ ok: true, service: "line-webhook-worker" }),
    };
  }

  if (request.method !== "POST" || url.pathname !== "/webhook") {
    return { status: 404, body: JSON.stringify({ error: "not_found" }) };
  }

  const rawBody = await request.text();
  const requireSignature =
    (env.LINE_WEBHOOK_SIGNATURE_REQUIRED ?? "false").toLowerCase() === "true";
  const verifier = createSignatureVerifier(env);
  const parsed = parseWebhook(rawBody, {
    signatureHeader: request.headers["x-line-signature"],
    signatureVerifier: verifier,
    requireSignature,
  });

  if (!parsed.ok) {
    const status = parsed.error?.code === "INVALID_SIGNATURE" ? 401 : 400;
    return { status, body: JSON.stringify({ error: parsed.error }) };
  }

  // Fast ACK path: forward to assistant-api (or queue in production)
  const base = env.ASSISTANT_API_BASE_URL ?? "http://127.0.0.1:8787";
  const result = await forward(`${base}/v1/line/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-token": env.ASSISTANT_API_INTERNAL_TOKEN ?? "",
      "x-line-signature": request.headers["x-line-signature"] ?? "",
    },
    body: rawBody,
  });

  return {
    status: result.status,
    body: JSON.stringify(result.body),
    headers: { "content-type": "application/json" },
  };
}

/** Cloudflare Workers entry shape (not deployed in foundation). */
export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
  ): Promise<Response> {
    const headers: Record<string, string | undefined> = {};
    request.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    const out = await handleWorkerFetch(
      {
        method: request.method,
        url: request.url,
        headers,
        text: () => request.text(),
      },
      env,
      async (path, init) => {
        // Foundation default: refuse real network in worker export.
        // Tests inject a mock forwarder.
        void path;
        void init;
        return {
          status: 501,
          body: {
            error: "forward_not_wired",
            message: "Inject ForwardFn in tests; production wires fetch().",
          },
        };
      },
    );
    return new Response(out.body, {
      status: out.status,
      headers: out.headers,
    });
  },
};
