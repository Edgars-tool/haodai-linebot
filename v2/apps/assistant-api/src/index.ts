/**
 * assistant-api — internal HTTP surface for n8n and the LINE worker.
 *
 * Foundation ships a pure request router (no production listen bind required
 * for tests). Real secrets are never read here; callers inject services.
 */
import {
  createAssistantServices,
  createInMemoryUnitOfWork,
  type AssistantServices,
  nowIso,
  newId,
} from "@haodai/domain";
import { parseWebhook, type SignatureVerifier } from "@haodai/line-events";
import { handleNormalizedLineEvent } from "@haodai/domain";

export interface HttpRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  body: string;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

export function createApp(services?: AssistantServices) {
  const svc =
    services ??
    createAssistantServices({
      db: createInMemoryUnitOfWork(),
    });

  return {
    services: svc,
    async handle(req: HttpRequest): Promise<HttpResponse> {
      const path = req.path.replace(/\/+$/, "") || "/";

      if (req.method === "GET" && path === "/health") {
        return { status: 200, body: { ok: true, service: "assistant-api" } };
      }

      // LINE webhook ingress (worker may forward here)
      if (req.method === "POST" && path === "/v1/line/webhook") {
        return handleLineWebhook(svc, req);
      }

      // n8n: due reminders
      if (req.method === "GET" && path === "/v1/internal/reminders/due") {
        const due = await svc.reminders.listDue();
        return {
          status: 200,
          body: {
            reminders: due.map((r) => ({
              reminder_id: r.id,
              user_id: r.userId,
              title: r.title,
              remind_at: r.remindAt,
              delivery_key: `delivery:${r.id}:${r.remindAt}`,
            })),
          },
        };
      }

      // n8n: mark delivered
      if (req.method === "POST" && path === "/v1/internal/reminders/delivered") {
        const json = JSON.parse(req.body || "{}") as {
          user_id: string;
          reminder_id: string;
          delivery_key: string;
          delivered_at?: string;
        };
        const out = await svc.reminders.markDelivered({
          user_id: json.user_id,
          reminder_id: json.reminder_id,
          delivery_key: json.delivery_key,
          delivered_at: json.delivered_at ?? nowIso(svc.clock()),
        });
        return { status: 200, body: out };
      }

      // n8n: build daily summary
      if (req.method === "POST" && path === "/v1/internal/summary/daily") {
        const json = JSON.parse(req.body || "{}") as {
          user_id: string;
          timezone?: string;
          idempotency_key?: string;
        };
        const out = await svc.summaries.build({
          user_id: json.user_id,
          timezone: json.timezone ?? "Asia/Taipei",
          idempotency_key:
            json.idempotency_key ?? `summary:${json.user_id}:${newId()}`,
        });
        return { status: 200, body: out };
      }

      // Placeholder LINE push (does not call real LINE)
      if (req.method === "POST" && path === "/v1/internal/line/push") {
        const json = JSON.parse(req.body || "{}") as {
          to_user_id: string;
          messages: unknown[];
          delivery_key?: string;
        };
        return {
          status: 200,
          body: {
            ok: true,
            simulated: true,
            to_user_id: json.to_user_id,
            message_count: Array.isArray(json.messages) ? json.messages.length : 0,
            delivery_key: json.delivery_key ?? null,
          },
        };
      }

      return { status: 404, body: { error: "not_found", path } };
    },
  };
}

async function handleLineWebhook(
  svc: AssistantServices,
  req: HttpRequest,
): Promise<HttpResponse> {
  const requireSignature =
    (req.headers["x-require-signature"] ?? "false").toLowerCase() === "true";
  // Signature verifier is injected only in production wiring; foundation defaults off.
  const verifier: SignatureVerifier | undefined = undefined;
  const parsed = parseWebhook(req.body, {
    signatureHeader: req.headers["x-line-signature"],
    signatureVerifier: verifier,
    requireSignature,
    nowMs: svc.clock(),
  });
  if (!parsed.ok) {
    const status = parsed.error?.code === "INVALID_SIGNATURE" ? 401 : 400;
    return { status, body: { error: parsed.error } };
  }

  const results = [];
  for (const event of parsed.events) {
    const r = await handleNormalizedLineEvent(svc, event, req.body);
    results.push(r);
  }
  return { status: 200, body: { results } };
}

/** CLI entry — only starts when executed directly with ENABLE_LISTEN=1 */
export async function main(): Promise<void> {
  if (process.env["ENABLE_LISTEN"] !== "1") {
    console.log(
      "assistant-api foundation loaded (no listen). Set ENABLE_LISTEN=1 to bind.",
    );
    return;
  }
  console.log("Listen mode is intentionally minimal in foundation; use tests.");
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("assistant-api/src/index.ts");

if (isMain) {
  void main();
}
