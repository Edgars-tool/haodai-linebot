import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** Reply tokens from LINE expire ~30 seconds after delivery. */
export const REPLY_TOKEN_TTL_MS = 30_000;

export interface SignatureVerifier {
  verify(rawBody: string | Buffer, signatureHeader: string | undefined): boolean;
}

export class HmacSha256SignatureVerifier implements SignatureVerifier {
  constructor(private readonly channelSecret: string) {}

  verify(rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
    if (!signatureHeader) return false;
    const body =
      typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody;
    const digest = createHmac("sha256", this.channelSecret)
      .update(body)
      .digest("base64");
    try {
      const a = Buffer.from(digest);
      const b = Buffer.from(signatureHeader);
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }
}

/** Dev/test verifier that always accepts when signature checks are disabled. */
export class NoopSignatureVerifier implements SignatureVerifier {
  verify(_rawBody: string | Buffer, _signatureHeader: string | undefined): boolean {
    return true;
  }
}

const LineSourceSchema = z.object({
  type: z.enum(["user", "group", "room"]),
  userId: z.string().optional(),
  groupId: z.string().optional(),
  roomId: z.string().optional(),
});

const LineTextMessageSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  text: z.string(),
  quoteToken: z.string().optional(),
});

const LineMessageEventSchema = z.object({
  type: z.literal("message"),
  mode: z.string().optional(),
  timestamp: z.number(),
  source: LineSourceSchema,
  webhookEventId: z.string(),
  deliveryContext: z
    .object({
      isRedelivery: z.boolean().optional(),
    })
    .optional(),
  replyToken: z.string(),
  message: z.union([
    LineTextMessageSchema,
    z.object({ id: z.string(), type: z.string() }).passthrough(),
  ]),
});

const LinePostbackEventSchema = z.object({
  type: z.literal("postback"),
  mode: z.string().optional(),
  timestamp: z.number(),
  source: LineSourceSchema,
  webhookEventId: z.string(),
  deliveryContext: z
    .object({
      isRedelivery: z.boolean().optional(),
    })
    .optional(),
  replyToken: z.string(),
  postback: z.object({
    data: z.string(),
    params: z.record(z.string()).optional(),
  }),
});

const LineFollowEventSchema = z.object({
  type: z.literal("follow"),
  mode: z.string().optional(),
  timestamp: z.number(),
  source: LineSourceSchema,
  webhookEventId: z.string(),
  deliveryContext: z
    .object({
      isRedelivery: z.boolean().optional(),
    })
    .optional(),
  replyToken: z.string(),
});

const LineOtherEventSchema = z
  .object({
    type: z.string(),
    timestamp: z.number().optional(),
    source: LineSourceSchema.optional(),
    webhookEventId: z.string().optional(),
  })
  .passthrough();

export const LineWebhookBodySchema = z.object({
  destination: z.string().optional(),
  events: z.array(
    z.union([
      LineMessageEventSchema,
      LinePostbackEventSchema,
      LineFollowEventSchema,
      LineOtherEventSchema,
    ]),
  ),
});

export type LineWebhookBody = z.infer<typeof LineWebhookBodySchema>;

export type NormalizedEventKind =
  | "text_message"
  | "postback"
  | "follow"
  | "unsupported"
  | "invalid";

export interface NormalizedLineEvent {
  kind: NormalizedEventKind;
  sourceEventId: string;
  isRedelivery: boolean;
  userId: string | null;
  timestamp: number;
  receivedAt: string;
  replyToken: string | null;
  replyTokenExpiresAt: string | null;
  idempotencyKey: string;
  text?: string;
  postbackData?: string;
  postbackParams?: Record<string, string>;
  rawType: string;
}

export interface ParseWebhookResult {
  ok: boolean;
  error?: {
    code: "INVALID_SIGNATURE" | "INVALID_BODY" | "EMPTY";
    message: string;
  };
  events: NormalizedLineEvent[];
}

function extractUserId(source: z.infer<typeof LineSourceSchema> | undefined): string | null {
  if (!source) return null;
  return source.userId ?? null;
}

function replyExpiry(timestampMs: number, nowMs: number): string | null {
  // LINE reply tokens are relative to receipt; use max(event ts, now) + TTL.
  const base = Math.max(timestampMs, nowMs);
  return new Date(base + REPLY_TOKEN_TTL_MS).toISOString();
}

export function buildIdempotencyKey(
  sourceEventId: string,
  suffix?: string,
): string {
  return suffix ? `line:${sourceEventId}:${suffix}` : `line:${sourceEventId}`;
}

export function normalizeEvent(
  event: LineWebhookBody["events"][number],
  nowMs: number = Date.now(),
): NormalizedLineEvent {
  const webhookEventId =
    "webhookEventId" in event && typeof event.webhookEventId === "string"
      ? event.webhookEventId
      : `missing-${nowMs}`;
  const deliveryContext =
    "deliveryContext" in event &&
    event.deliveryContext &&
    typeof event.deliveryContext === "object"
      ? (event.deliveryContext as { isRedelivery?: boolean })
      : undefined;
  const isRedelivery = Boolean(deliveryContext?.isRedelivery);
  const timestamp =
    "timestamp" in event && typeof event.timestamp === "number"
      ? event.timestamp
      : nowMs;
  const source =
    "source" in event
      ? (event.source as z.infer<typeof LineSourceSchema> | undefined)
      : undefined;
  const userId = extractUserId(source);
  const replyToken =
    "replyToken" in event && typeof event.replyToken === "string"
      ? event.replyToken
      : null;

  if (event.type === "message" && "message" in event) {
    const msg = event.message as { type?: string; text?: string; id?: string };
    if (msg.type === "text" && typeof msg.text === "string") {
      return {
        kind: "text_message",
        sourceEventId: webhookEventId,
        isRedelivery,
        userId,
        timestamp,
        receivedAt: new Date(timestamp).toISOString(),
        replyToken,
        replyTokenExpiresAt: replyToken
          ? replyExpiry(timestamp, nowMs)
          : null,
        idempotencyKey: buildIdempotencyKey(webhookEventId, "message"),
        text: msg.text,
        rawType: "message",
      };
    }
    return {
      kind: "unsupported",
      sourceEventId: webhookEventId,
      isRedelivery,
      userId,
      timestamp,
      receivedAt: new Date(timestamp).toISOString(),
      replyToken,
      replyTokenExpiresAt: replyToken ? replyExpiry(timestamp, nowMs) : null,
      idempotencyKey: buildIdempotencyKey(webhookEventId, "message"),
      rawType: `message:${msg.type ?? "unknown"}`,
    };
  }

  if (event.type === "postback" && "postback" in event) {
    const pb = event.postback as {
      data: string;
      params?: Record<string, string>;
    };
    return {
      kind: "postback",
      sourceEventId: webhookEventId,
      isRedelivery,
      userId,
      timestamp,
      receivedAt: new Date(timestamp).toISOString(),
      replyToken,
      replyTokenExpiresAt: replyToken ? replyExpiry(timestamp, nowMs) : null,
      idempotencyKey: buildIdempotencyKey(webhookEventId, "postback"),
      postbackData: pb.data,
      postbackParams: pb.params,
      rawType: "postback",
    };
  }

  if (event.type === "follow") {
    return {
      kind: "follow",
      sourceEventId: webhookEventId,
      isRedelivery,
      userId,
      timestamp,
      receivedAt: new Date(timestamp).toISOString(),
      replyToken,
      replyTokenExpiresAt: replyToken ? replyExpiry(timestamp, nowMs) : null,
      idempotencyKey: buildIdempotencyKey(webhookEventId, "follow"),
      rawType: "follow",
    };
  }

  return {
    kind: "unsupported",
    sourceEventId: webhookEventId,
    isRedelivery,
    userId,
    timestamp,
    receivedAt: new Date(timestamp).toISOString(),
    replyToken,
    replyTokenExpiresAt: null,
    idempotencyKey: buildIdempotencyKey(webhookEventId, String(event.type)),
    rawType: String(event.type),
  };
}

export function parseWebhook(
  rawBody: string | Buffer,
  options: {
    signatureHeader?: string;
    signatureVerifier?: SignatureVerifier;
    requireSignature?: boolean;
    nowMs?: number;
  } = {},
): ParseWebhookResult {
  const {
    signatureHeader,
    signatureVerifier,
    requireSignature = false,
    nowMs = Date.now(),
  } = options;

  if (requireSignature) {
    if (!signatureVerifier) {
      return {
        ok: false,
        error: {
          code: "INVALID_SIGNATURE",
          message: "Signature verifier required but not provided",
        },
        events: [],
      };
    }
    if (!signatureVerifier.verify(rawBody, signatureHeader)) {
      return {
        ok: false,
        error: {
          code: "INVALID_SIGNATURE",
          message: "LINE signature verification failed",
        },
        events: [],
      };
    }
  }

  let json: unknown;
  try {
    const text =
      typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    json = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: { code: "INVALID_BODY", message: "Body is not valid JSON" },
      events: [],
    };
  }

  const parsed = LineWebhookBodySchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        code: "INVALID_BODY",
        message: parsed.error.issues.map((i) => i.message).join("; "),
      },
      events: [],
    };
  }

  if (parsed.data.events.length === 0) {
    return {
      ok: false,
      error: { code: "EMPTY", message: "Webhook contains no events" },
      events: [],
    };
  }

  return {
    ok: true,
    events: parsed.data.events.map((e) => normalizeEvent(e, nowMs)),
  };
}

export interface LineResponseModel {
  mode: "reply" | "push";
  replyToken?: string;
  toUserId?: string;
  messages: Array<{
    type: "text";
    text: string;
    quickReply?: {
      items: Array<{
        type: "action";
        action: {
          type: "postback";
          label: string;
          data: string;
          displayText?: string;
        };
      }>;
    };
  }>;
  /** When reply token is expired, callers should fall back to push. */
  replyTokenExpired: boolean;
}

export function buildReplyOrPush(params: {
  replyToken: string | null;
  replyTokenExpiresAt: string | null;
  userId: string | null;
  text: string;
  quickReplies?: Array<{ label: string; data: string; displayText?: string }>;
  nowMs?: number;
}): LineResponseModel {
  const nowMs = params.nowMs ?? Date.now();
  const expired =
    !params.replyToken ||
    !params.replyTokenExpiresAt ||
    Date.parse(params.replyTokenExpiresAt) <= nowMs;

  const messages: LineResponseModel["messages"] = [
    {
      type: "text",
      text: params.text,
      ...(params.quickReplies && params.quickReplies.length > 0
        ? {
            quickReply: {
              items: params.quickReplies.map((q) => ({
                type: "action" as const,
                action: {
                  type: "postback" as const,
                  label: q.label,
                  data: q.data,
                  displayText: q.displayText,
                },
              })),
            },
          }
        : {}),
    },
  ];

  if (!expired && params.replyToken) {
    return {
      mode: "reply",
      replyToken: params.replyToken,
      messages,
      replyTokenExpired: false,
    };
  }

  return {
    mode: "push",
    toUserId: params.userId ?? undefined,
    messages,
    replyTokenExpired: true,
  };
}
