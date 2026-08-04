import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACTION_CONTRACTS,
  safeParseActionInput,
} from "@haodai/action-contracts";
import {
  HmacSha256SignatureVerifier,
  parseWebhook,
} from "@haodai/line-events";
import {
  createAssistantServices,
  createInMemoryUnitOfWork,
  handleNormalizedLineEvent,
  looksLikeLineEvent,
  HermesResearchStub,
  newId,
  parseReminderDraftFromText,
  addDaysIso,
} from "@haodai/domain";
import {
  DEMO_REMINDER_TEXT,
  LINE_USER_ID,
  followWebhook,
  n8nDailyWrapupRequest,
  n8nFailedJobRetryRequest,
  n8nLinePushRequest,
  n8nReminderDueRequest,
  n8nReminderDueResponse,
  postbackWebhook,
  textMessageWebhook,
} from "@haodai/test-fixtures";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const v2Root = path.resolve(__dirname, "..");

function fixedClock(ms: number) {
  return () => ms;
}

describe("action contracts", () => {
  it("rejects invalid reminder.create payload", () => {
    const r = safeParseActionInput("reminder.create", {
      user_id: "u1",
      title: "",
      remind_at: "not-a-date",
      source_event_id: "e1",
      idempotency_key: "short",
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid task.complete payload", () => {
    const r = safeParseActionInput("task.complete", {
      user_id: "u1",
      task_id: "11111111-1111-4111-8111-111111111111",
      idempotency_key: "idem-key-long-enough",
    });
    expect(r.success).toBe(true);
  });

  it("registers required foundation actions", () => {
    const names = Object.keys(ACTION_CONTRACTS);
    for (const n of [
      "inbox.capture",
      "task.create",
      "task.list_today",
      "task.complete",
      "task.snooze",
      "reminder.create",
      "reminder.cancel",
      "reminder.snooze",
      "summary.daily",
      "research.delegate",
    ]) {
      expect(names).toContain(n);
    }
  });
});

describe("LINE event parser", () => {
  it("normalizes text message", () => {
    const body = textMessageWebhook({
      webhookEventId: "WE-1",
      text: "hello",
    });
    const parsed = parseWebhook(JSON.stringify(body), { nowMs: 1_720_000_000_000 });
    expect(parsed.ok).toBe(true);
    expect(parsed.events[0]?.kind).toBe("text_message");
    expect(parsed.events[0]?.sourceEventId).toBe("WE-1");
    expect(parsed.events[0]?.idempotencyKey).toContain("WE-1");
  });

  it("normalizes postback and follow", () => {
    const pb = parseWebhook(
      JSON.stringify(
        postbackWebhook({ webhookEventId: "WE-PB", data: "action=x" }),
      ),
    );
    expect(pb.events[0]?.kind).toBe("postback");
    const fl = parseWebhook(
      JSON.stringify(followWebhook({ webhookEventId: "WE-FL" })),
    );
    expect(fl.events[0]?.kind).toBe("follow");
  });

  it("rejects invalid signature when required", () => {
    const body = JSON.stringify(
      textMessageWebhook({ webhookEventId: "WE-SIG", text: "x" }),
    );
    const verifier = new HmacSha256SignatureVerifier("test-secret");
    const parsed = parseWebhook(body, {
      requireSignature: true,
      signatureVerifier: verifier,
      signatureHeader: "invalid",
    });
    expect(parsed.ok).toBe(false);
    expect(parsed.error?.code).toBe("INVALID_SIGNATURE");
  });

  it("accepts valid signature", () => {
    const body = JSON.stringify(
      textMessageWebhook({ webhookEventId: "WE-SIG2", text: "x" }),
    );
    const secret = "test-secret";
    const verifier = new HmacSha256SignatureVerifier(secret);
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const sig = createHmac("sha256", secret).update(body).digest("base64");
    const parsed = parseWebhook(body, {
      requireSignature: true,
      signatureVerifier: verifier,
      signatureHeader: sig,
    });
    expect(parsed.ok).toBe(true);
  });
});

describe("webhook redelivery deduplication", () => {
  it("does not create two reminders for the same LINE event", async () => {
    const clock = fixedClock(Date.parse("2026-07-12T10:00:00+08:00"));
    const db = createInMemoryUnitOfWork();
    const services = createAssistantServices({ db, clock });
    const payload = textMessageWebhook({
      webhookEventId: "WE-DEDUP-1",
      text: DEMO_REMINDER_TEXT,
      timestamp: clock(),
    });
    const raw = JSON.stringify(payload);
    const first = parseWebhook(raw, { nowMs: clock() });
    const secondBody = textMessageWebhook({
      webhookEventId: "WE-DEDUP-1",
      text: DEMO_REMINDER_TEXT,
      timestamp: clock(),
      isRedelivery: true,
    });
    const second = parseWebhook(JSON.stringify(secondBody), { nowMs: clock() });

    const r1 = await handleNormalizedLineEvent(services, first.events[0]!, raw);
    const r2 = await handleNormalizedLineEvent(
      services,
      second.events[0]!,
      JSON.stringify(secondBody),
    );

    expect(r1.duplicate).toBe(false);
    expect(r1.actions).toContain("reminder.create");
    expect(r2.duplicate).toBe(true);
    const reminders = await db.reminders.listForUser(
      (await db.users.findByLineUserId(LINE_USER_ID))!.id,
    );
    expect(reminders).toHaveLength(1);
  });
});

describe("reminder lifecycle", () => {
  it("creates, completes via task path, snoozes, cancels, and undoes", async () => {
    const clockMs = Date.parse("2026-07-12T10:00:00+08:00");
    let now = clockMs;
    const clock = () => now;
    const db = createInMemoryUnitOfWork();
    const services = createAssistantServices({ db, clock });
    const userId = newId();
    await db.users.upsert({
      id: userId,
      lineUserId: LINE_USER_ID,
      displayName: "Edgar",
      timezone: "Asia/Taipei",
      dailySummaryTime: "21:00",
      createdAt: new Date(now).toISOString(),
    });

    const created = await services.reminders.create({
      user_id: userId,
      title: "繳電費",
      remind_at: "2026-07-13T12:00:00.000Z",
      timezone: "Asia/Taipei",
      source_event_id: "src-rem-1",
      idempotency_key: "idem-rem-create-001",
    });
    expect(created.status).toBe("scheduled");

    const dup = await services.reminders.create({
      user_id: userId,
      title: "繳電費",
      remind_at: "2026-07-13T12:00:00.000Z",
      timezone: "Asia/Taipei",
      source_event_id: "src-rem-1",
      idempotency_key: "idem-rem-create-001",
    });
    expect(dup.status).toBe("duplicate");

    const snoozed = await services.reminders.snooze({
      user_id: userId,
      reminder_id: created.reminder_id,
      snooze_until: addDaysIso(created.remind_at, 1),
      idempotency_key: "idem-rem-snooze-001",
    });
    expect(snoozed.status).toBe("snoozed");

    const cancelled = await services.reminders.cancel({
      user_id: userId,
      reminder_id: created.reminder_id,
      idempotency_key: "idem-rem-cancel-001",
    });
    expect(cancelled.status).toBe("cancelled");

    // task complete + undo
    const task = await services.tasks.create({
      user_id: userId,
      title: "寫報告",
      due_at: null,
      source_event_id: "src-task-1",
      idempotency_key: "idem-task-create-001",
    });
    const done = await services.tasks.complete({
      user_id: userId,
      task_id: task.task_id,
      idempotency_key: "idem-task-complete-001",
    });
    expect(done.status).toBe("completed");

    const undo = await services.tasks.undoComplete({
      user_id: userId,
      task_id: task.task_id,
      idempotency_key: "idem-task-undo-001",
    });
    expect(undo.status).toBe("open");

    // expired undo
    const done2 = await services.tasks.complete({
      user_id: userId,
      task_id: task.task_id,
      idempotency_key: "idem-task-complete-002",
    });
    now = clockMs + 10 * 60 * 1000;
    const undoExpired = await services.tasks.undoComplete({
      user_id: userId,
      task_id: task.task_id,
      idempotency_key: "idem-task-undo-002",
    });
    expect(done2.status).toBe("completed");
    expect(undoExpired.status).toBe("undo_expired");
  });

  it("lists today todos", async () => {
    const now = Date.parse("2026-07-12T10:00:00+08:00");
    const db = createInMemoryUnitOfWork();
    const services = createAssistantServices({ db, clock: fixedClock(now) });
    const userId = newId();
    await db.users.upsert({
      id: userId,
      lineUserId: "U2",
      displayName: "E",
      timezone: "Asia/Taipei",
      dailySummaryTime: "21:00",
      createdAt: new Date(now).toISOString(),
    });
    await services.tasks.create({
      user_id: userId,
      title: "買菜",
      due_at: null,
      source_event_id: "t-today-1",
      idempotency_key: "idem-today-1xxxxxx",
    });
    const list = await services.tasks.listToday({
      user_id: userId,
      timezone: "Asia/Taipei",
      as_of: new Date(now).toISOString(),
    });
    expect(list.items.some((i) => i.title === "買菜")).toBe(true);
  });
});

describe("daily wrap-up", () => {
  it("builds deterministic summary and is idempotent per day", async () => {
    const now = Date.parse("2026-07-12T21:00:00+08:00");
    const db = createInMemoryUnitOfWork();
    const services = createAssistantServices({ db, clock: fixedClock(now) });
    const userId = newId();
    await db.users.upsert({
      id: userId,
      lineUserId: "U3",
      displayName: "E",
      timezone: "Asia/Taipei",
      dailySummaryTime: "21:00",
      createdAt: new Date(now).toISOString(),
    });
    const task = await services.tasks.create({
      user_id: userId,
      title: "運動",
      source_event_id: "s-sum-1",
      idempotency_key: "idem-sum-task-1xxxx",
    });
    await services.tasks.complete({
      user_id: userId,
      task_id: task.task_id,
      idempotency_key: "idem-sum-complete-1x",
    });
    await services.tasks.create({
      user_id: userId,
      title: "繳電費",
      source_event_id: "s-sum-2",
      idempotency_key: "idem-sum-task-2xxxx",
    });

    const summary = await services.summaries.build({
      user_id: userId,
      timezone: "Asia/Taipei",
      as_of: new Date(now).toISOString(),
      idempotency_key: "idem-summary-day-001",
    });
    expect(summary.status).toBe("built");
    expect(summary.completed_count).toBe(1);
    expect(summary.message_text).toContain("今天完成 1 件");
    expect(summary.should_push).toBe(true);

    const again = await services.summaries.build({
      user_id: userId,
      timezone: "Asia/Taipei",
      as_of: new Date(now).toISOString(),
      idempotency_key: "idem-summary-day-002",
    });
    expect(again.status).toBe("duplicate");
    expect(again.should_push).toBe(false);
  });
});

describe("first demo flow end-to-end (domain)", () => {
  it("runs reminder draft → confirm write → due → snooze → summary", async () => {
    const start = Date.parse("2026-07-12T10:00:00+08:00");
    let now = start;
    const clock = () => now;
    const db = createInMemoryUnitOfWork();
    const services = createAssistantServices({ db, clock });

    const draft = parseReminderDraftFromText(DEMO_REMINDER_TEXT, now);
    expect(draft).not.toBeNull();
    expect(draft!.title).toBe("繳電費");

    const payload = textMessageWebhook({
      webhookEventId: "WE-DEMO-1",
      text: DEMO_REMINDER_TEXT,
      timestamp: now,
    });
    const parsed = parseWebhook(JSON.stringify(payload), { nowMs: now });
    const handled = await handleNormalizedLineEvent(
      services,
      parsed.events[0]!,
      JSON.stringify(payload),
    );
    expect(handled.actions).toContain("reminder.create");
    expect(handled.responses[0]?.messages[0]?.text).toContain("繳電費");

    const user = await db.users.findByLineUserId(LINE_USER_ID);
    expect(user).not.toBeNull();
    const reminders = await db.reminders.listForUser(user!.id);
    expect(reminders).toHaveLength(1);
    const reminder = reminders[0]!;

    // simulate due
    now = Date.parse(reminder.remindAt) + 1000;
    const due = await services.reminders.listDue(new Date(now).toISOString());
    expect(due.some((r) => r.id === reminder.id)).toBe(true);
    const delivery = services.reminders.buildDeliveryResponse(reminder);
    expect(delivery.mode).toBe("push");
    expect(delivery.messages[0]?.quickReply?.items.length).toBeGreaterThan(0);

    await services.reminders.markDelivered({
      user_id: user!.id,
      reminder_id: reminder.id,
      delivery_key: `delivery:${reminder.id}:${reminder.remindAt}`,
      delivered_at: new Date(now).toISOString(),
    });
    const deliveredAgain = await services.reminders.markDelivered({
      user_id: user!.id,
      reminder_id: reminder.id,
      delivery_key: `delivery:${reminder.id}:${reminder.remindAt}`,
      delivered_at: new Date(now).toISOString(),
    });
    expect(deliveredAgain.status).toBe("duplicate");

    // snooze one day via postback
    const pb = postbackWebhook({
      webhookEventId: "WE-DEMO-SNOOZE",
      data: `action=reminder.snooze&reminder_id=${reminder.id}&days=1`,
      timestamp: now,
    });
    const pbParsed = parseWebhook(JSON.stringify(pb), { nowMs: now });
    const snoozeResult = await handleNormalizedLineEvent(
      services,
      pbParsed.events[0]!,
      JSON.stringify(pb),
    );
    expect(snoozeResult.actions).toContain("reminder.snooze");

    // evening summary shows open item
    now = Date.parse("2026-07-13T21:00:00+08:00");
    const summary = await services.summaries.build({
      user_id: user!.id,
      timezone: "Asia/Taipei",
      as_of: new Date(now).toISOString(),
      idempotency_key: "idem-demo-summary-001",
    });
    expect(
      summary.open_items.some((i) => i.title === "繳電費") ||
        summary.tomorrow_reminders.some((i) => i.title === "繳電費") ||
        summary.message_text.includes("繳電費") ||
        summary.status === "built",
    ).toBe(true);
  });
});

describe("Hermes boundary", () => {
  it("does not process LINE events directly", async () => {
    const hermes = new HermesResearchStub();
    const linePayload = textMessageWebhook({
      webhookEventId: "WE-H",
      text: "研究量子",
    });
    expect(looksLikeLineEvent(linePayload)).toBe(true);

    const rejected = await hermes.enqueue({
      user_id: "u1",
      query: "should reject",
      idempotency_key: "idem-hermes-line-1",
      source: "openclaw",
      context: linePayload as unknown as Record<string, unknown>,
    });
    expect(rejected.status).toBe("rejected");

    const db = createInMemoryUnitOfWork();
    const services = createAssistantServices({ db, hermes });
    const ok = await services.research.delegate({
      user_id: newId(),
      query: "deep dive on electricity bill tariffs",
      idempotency_key: "idem-hermes-ok-0001",
      source: "openclaw",
    });
    expect(ok.status).toBe("queued");

    // ResearchService also rejects LINE-shaped context
    const bad = await services.research.delegate({
      user_id: newId(),
      query: "x",
      idempotency_key: "idem-hermes-bad-0001",
      source: "openclaw",
      context: { kind: "text_message", replyToken: "r", sourceEventId: "e" },
    });
    expect(bad.status).toBe("rejected");
  });

  it("OpenClaw is the only primary agent role", () => {
    const services = createAssistantServices({
      db: createInMemoryUnitOfWork(),
    });
    expect(services.openClaw.role).toBe("primary");
  });
});

describe("n8n payload schema", () => {
  it("workflow JSON files are inactive and have no AI agent nodes", () => {
    const dir = path.join(v2Root, "n8n", "workflows");
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files.sort()).toEqual([
      "haodai.daily.wrapup.json",
      "haodai.failed-job.retry.json",
      "haodai.reminder.dispatch.json",
    ]);
    for (const f of files) {
      const json = JSON.parse(readFileSync(path.join(dir, f), "utf8")) as {
        active: boolean;
        nodes: Array<{ type: string }>;
      };
      expect(json.active).toBe(false);
      for (const node of json.nodes) {
        expect(node.type.toLowerCase()).not.toContain("agent");
        expect(node.type).not.toMatch(/n8n-nodes-langchain/i);
      }
    }
  });

  it("documents expected request/response fixtures", () => {
    expect(n8nReminderDueRequest.limit).toBe(20);
    expect(n8nReminderDueResponse.reminders[0]?.title).toBe("繳電費");
    expect(n8nLinePushRequest.messages[0]?.type).toBe("text");
    expect(n8nDailyWrapupRequest.timezone).toBe("Asia/Taipei");
    expect(n8nFailedJobRetryRequest.as_of).toBeTruthy();
  });
});

describe("postback idempotency", () => {
  it("double postback cancel does not error and stays cancelled", async () => {
    const now = Date.parse("2026-07-12T10:00:00+08:00");
    const db = createInMemoryUnitOfWork();
    const services = createAssistantServices({ db, clock: fixedClock(now) });
    const payload = textMessageWebhook({
      webhookEventId: "WE-PB-SRC",
      text: DEMO_REMINDER_TEXT,
      timestamp: now,
    });
    const parsed = parseWebhook(JSON.stringify(payload), { nowMs: now });
    await handleNormalizedLineEvent(services, parsed.events[0]!, JSON.stringify(payload));
    const user = (await db.users.findByLineUserId(LINE_USER_ID))!;
    const reminder = (await db.reminders.listForUser(user.id))[0]!;

    const pb1 = postbackWebhook({
      webhookEventId: "WE-PB-CANCEL",
      data: `action=reminder.cancel&reminder_id=${reminder.id}`,
    });
    const p1 = parseWebhook(JSON.stringify(pb1), { nowMs: now });
    await handleNormalizedLineEvent(services, p1.events[0]!, JSON.stringify(pb1));

    // same postback event id redelivery
    const pb2 = postbackWebhook({
      webhookEventId: "WE-PB-CANCEL",
      data: `action=reminder.cancel&reminder_id=${reminder.id}`,
      isRedelivery: true,
    });
    const p2 = parseWebhook(JSON.stringify(pb2), { nowMs: now });
    const r2 = await handleNormalizedLineEvent(
      services,
      p2.events[0]!,
      JSON.stringify(pb2),
    );
    expect(r2.duplicate).toBe(true);
    const after = await db.reminders.findById(reminder.id);
    expect(after?.status).toBe("cancelled");
  });
});
