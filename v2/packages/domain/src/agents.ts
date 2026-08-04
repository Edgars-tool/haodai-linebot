import type {
  ResearchDelegateInput,
  ResearchDelegateOutput,
} from "@haodai/action-contracts";
import type { NormalizedLineEvent } from "@haodai/line-events";

/**
 * OpenClaw is the ONLY primary agent that may interpret LINE user intent
 * and organize replies. Domain services remain deterministic; OpenClaw
 * sits at the orchestration boundary.
 */
export interface OpenClawAgent {
  readonly role: "primary";
  /**
   * Interpret a normalized LINE event into domain action intents.
   * Foundation provides a deterministic stub; production plugs the real client.
   */
  interpretLineEvent(event: NormalizedLineEvent): Promise<OpenClawIntent[]>;
  /**
   * Optionally compose a user-facing confirmation message.
   */
  composeConfirmation(params: {
    action: string;
    payload: Record<string, unknown>;
  }): Promise<string>;
}

export type OpenClawIntent =
  | {
      type: "reminder.create";
      title: string;
      remindAt: string;
      timezone?: string;
    }
  | {
      type: "task.create";
      title: string;
      dueAt?: string | null;
    }
  | {
      type: "inbox.capture";
      content: string;
      contentType: "text" | "image" | "audio" | "url" | "forwarded";
    }
  | {
      type: "task.list_today";
    }
  | {
      type: "noop";
      reason: string;
    };

/**
 * Hermes is an internal deep-research worker only.
 * It MUST NEVER accept raw LINE webhook events or reply to LINE directly.
 */
export interface HermesResearchWorker {
  readonly role: "internal_research";
  /**
   * Accept only structured research jobs from OpenClaw / internal sources.
   * Implementations must reject any payload that looks like a LINE event.
   */
  enqueue(input: ResearchDelegateInput): Promise<ResearchDelegateOutput>;
}

/** Shape used to detect accidental LINE event leakage into Hermes. */
export function looksLikeLineEvent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.events) && obj.destination !== undefined) return true;
  if (typeof obj.webhookEventId === "string" && typeof obj.replyToken === "string")
    return true;
  if (obj.type === "message" && obj.message && typeof obj.message === "object")
    return true;
  if (obj.kind === "text_message" || obj.kind === "postback") return true;
  if (typeof obj.sourceEventId === "string" && typeof obj.replyToken === "string")
    return true;
  return false;
}

/**
 * Stub OpenClaw that uses deterministic NL fixtures (no real LLM).
 */
export class DeterministicOpenClawStub implements OpenClawAgent {
  readonly role = "primary" as const;

  constructor(
    private readonly parseReminder: (
      text: string,
      nowMs?: number,
    ) => { title: string; remindAt: string } | null,
    private readonly nowMs: () => number = () => Date.now(),
  ) {}

  async interpretLineEvent(event: NormalizedLineEvent): Promise<OpenClawIntent[]> {
    if (event.kind === "text_message" && event.text) {
      const text = event.text.trim();
      if (text === "今天" || text === "今天要做什麼" || text === "待辦") {
        return [{ type: "task.list_today" }];
      }
      const reminder = this.parseReminder(text, this.nowMs());
      if (reminder) {
        return [
          {
            type: "reminder.create",
            title: reminder.title,
            remindAt: reminder.remindAt,
            timezone: "Asia/Taipei",
          },
        ];
      }
      return [
        {
          type: "inbox.capture",
          content: text,
          contentType: "text",
        },
      ];
    }
    if (event.kind === "postback" && event.postbackData) {
      // Postbacks are handled by domain postback router, not OpenClaw NL.
      return [{ type: "noop", reason: "postback_routed_by_domain" }];
    }
    return [{ type: "noop", reason: `unsupported_kind:${event.kind}` }];
  }

  async composeConfirmation(params: {
    action: string;
    payload: Record<string, unknown>;
  }): Promise<string> {
    if (params.action === "reminder.create") {
      return `已設定提醒：${String(params.payload["title"] ?? "")}（${String(params.payload["remind_at"] ?? "")}）`;
    }
    if (params.action === "task.create") {
      return `已記下：${String(params.payload["title"] ?? "")}`;
    }
    return "好的，我收到了。";
  }
}

/**
 * Stub Hermes worker that only accepts research.delegate payloads.
 */
export class HermesResearchStub implements HermesResearchWorker {
  readonly role = "internal_research" as const;

  async enqueue(input: ResearchDelegateInput): Promise<ResearchDelegateOutput> {
    if (looksLikeLineEvent(input) || looksLikeLineEvent(input.context)) {
      return {
        job_id: "00000000-0000-4000-8000-000000000000",
        status: "rejected",
        message:
          "Hermes must not receive LINE events. Route through OpenClaw only.",
      };
    }
    // Real queueing happens in ResearchService; this stub just validates boundary.
    return {
      job_id: "00000000-0000-4000-8000-000000000001",
      status: "queued",
      message: "accepted_by_hermes_stub",
    };
  }
}
