import type {
  InboxCaptureInput,
  InboxCaptureOutput,
  ReminderCancelInput,
  ReminderCancelOutput,
  ReminderCreateInput,
  ReminderCreateOutput,
  ReminderMarkDeliveredInput,
  ReminderMarkDeliveredOutput,
  ReminderSnoozeInput,
  ReminderSnoozeOutput,
  ResearchDelegateInput,
  ResearchDelegateOutput,
  SummaryDailyInput,
  SummaryDailyOutput,
  TaskCompleteInput,
  TaskCompleteOutput,
  TaskCreateInput,
  TaskCreateOutput,
  TaskListTodayInput,
  TaskListTodayOutput,
  TaskSnoozeInput,
  TaskSnoozeOutput,
  TaskUndoCompleteInput,
  TaskUndoCompleteOutput,
} from "@haodai/action-contracts";
import {
  InboxCaptureInputSchema,
  ReminderCancelInputSchema,
  ReminderCreateInputSchema,
  ReminderMarkDeliveredInputSchema,
  ReminderSnoozeInputSchema,
  ResearchDelegateInputSchema,
  SummaryDailyInputSchema,
  TaskCompleteInputSchema,
  TaskCreateInputSchema,
  TaskListTodayInputSchema,
  TaskSnoozeInputSchema,
  TaskUndoCompleteInputSchema,
} from "@haodai/action-contracts";
import type { NormalizedLineEvent } from "@haodai/line-events";
import { buildReplyOrPush, type LineResponseModel } from "@haodai/line-events";
import type { HermesResearchWorker, OpenClawAgent } from "./agents.js";
import { looksLikeLineEvent } from "./agents.js";
import type {
  EventReceipt,
  InboxItem,
  Reminder,
  ResearchJob,
  Task,
  User,
} from "./entities.js";
import { DomainError } from "./errors.js";
import type { UnitOfWork } from "./repositories.js";
import {
  DEFAULT_TIMEZONE,
  MAX_REMINDER_DISPATCH,
  MAX_RETRIES,
  UNDO_WINDOW_MS,
  addDaysIso,
  dayBoundsIso,
  formatDateInTimeZone,
  hashPayload,
  newId,
  nextRetryAt,
  nowIso,
  parseReminderDraftFromText,
} from "./utils.js";

type Clock = () => number;

async function withIdempotency<T>(
  db: UnitOfWork,
  actionName: string,
  key: string,
  resourceId: string | null,
  run: () => Promise<T>,
  clock: Clock,
): Promise<{ value: T; duplicate: boolean }> {
  const existing = await db.actionReceipts.findByKey(key);
  if (existing) {
    return { value: existing.result as T, duplicate: true };
  }
  const value = await run();
  await db.actionReceipts.insert({
    idempotencyKey: key,
    actionName,
    resourceId,
    result: value,
    createdAt: nowIso(clock()),
  });
  return { value, duplicate: false };
}

export class EventReceiptService {
  constructor(
    private readonly db: UnitOfWork,
    private readonly clock: Clock = () => Date.now(),
  ) {}

  /**
   * Returns true if this is the first time we see the event (caller should process).
   * Returns false if duplicate / redelivery.
   */
  async begin(lineEventId: string, payload: string): Promise<boolean> {
    const existing = await this.db.eventReceipts.findByLineEventId(lineEventId);
    if (existing) {
      await this.db.eventReceipts.markDuplicate(lineEventId);
      return false;
    }
    const receipt: EventReceipt = {
      lineEventId,
      receivedAt: nowIso(this.clock()),
      processedAt: null,
      status: "received",
      payloadHash: hashPayload(payload),
    };
    try {
      await this.db.eventReceipts.insert(receipt);
      return true;
    } catch {
      // race: treat as duplicate
      await this.db.eventReceipts.markDuplicate(lineEventId);
      return false;
    }
  }

  async complete(lineEventId: string): Promise<void> {
    await this.db.eventReceipts.markProcessed(lineEventId, nowIso(this.clock()));
  }
}

export class InboxService {
  constructor(
    private readonly db: UnitOfWork,
    private readonly clock: Clock = () => Date.now(),
  ) {}

  async capture(raw: InboxCaptureInput): Promise<InboxCaptureOutput> {
    const input = InboxCaptureInputSchema.parse(raw);
    const bySource = await this.db.inboxItems.findBySourceEventId(
      input.source_event_id,
    );
    if (bySource) {
      return {
        inbox_item_id: bySource.id,
        status: "duplicate",
        classified_as: bySource.classifiedAs,
      };
    }

    const { value, duplicate } = await withIdempotency(
      this.db,
      "inbox.capture",
      input.idempotency_key,
      null,
      async () => {
        const item: InboxItem = {
          id: newId(),
          userId: input.user_id,
          sourceEventId: input.source_event_id,
          contentType: input.content_type,
          rawContent: input.content,
          classifiedAs: "unclassified",
          status: "open",
          createdAt: nowIso(this.clock()),
        };
        await this.db.inboxItems.insert(item);
        return {
          inbox_item_id: item.id,
          status: "captured" as const,
          classified_as: "unclassified" as const,
        };
      },
      this.clock,
    );
    if (duplicate) {
      return { ...value, status: "duplicate" };
    }
    return value;
  }
}

export class TaskService {
  constructor(
    private readonly db: UnitOfWork,
    private readonly clock: Clock = () => Date.now(),
  ) {}

  async create(raw: TaskCreateInput): Promise<TaskCreateOutput> {
    const input = TaskCreateInputSchema.parse(raw);
    const bySource = await this.db.tasks.findBySourceEventId(input.source_event_id);
    if (bySource) {
      return {
        task_id: bySource.id,
        status: "duplicate",
        title: bySource.title,
        due_at: bySource.dueAt,
      };
    }

    const { value, duplicate } = await withIdempotency(
      this.db,
      "task.create",
      input.idempotency_key,
      null,
      async () => {
        const task: Task = {
          id: newId(),
          userId: input.user_id,
          title: input.title,
          dueAt: input.due_at ?? null,
          status: "open",
          sourceEventId: input.source_event_id,
          createdAt: nowIso(this.clock()),
          completedAt: null,
          undoUntil: null,
          snoozeUntil: null,
        };
        await this.db.tasks.insert(task);
        return {
          task_id: task.id,
          status: "open" as const,
          title: task.title,
          due_at: task.dueAt,
        };
      },
      this.clock,
    );
    if (duplicate) return { ...value, status: "duplicate" };
    return value;
  }

  async listToday(raw: TaskListTodayInput): Promise<TaskListTodayOutput> {
    const input = TaskListTodayInputSchema.parse(raw);
    const tz = input.timezone ?? DEFAULT_TIMEZONE;
    const asOf = input.as_of ? Date.parse(input.as_of) : this.clock();
    const date = formatDateInTimeZone(new Date(asOf), tz);
    const { dayStartIso, dayEndIso } = dayBoundsIso(date, tz);
    const items = await this.db.tasks.listOpenForUserOnDate({
      userId: input.user_id,
      dayStartIso,
      dayEndIso,
    });
    return {
      timezone: tz,
      date,
      items: items.map((t) => ({
        task_id: t.id,
        title: t.title,
        due_at: t.dueAt,
        status: t.status,
      })),
    };
  }

  async complete(raw: TaskCompleteInput): Promise<TaskCompleteOutput> {
    const input = TaskCompleteInputSchema.parse(raw);
    const { value, duplicate } = await withIdempotency(
      this.db,
      "task.complete",
      input.idempotency_key,
      input.task_id,
      async () => {
        const task = await this.db.tasks.findById(input.task_id);
        if (!task || task.userId !== input.user_id) {
          throw new DomainError("NOT_FOUND", `Task not found: ${input.task_id}`);
        }
        if (task.status === "completed" && task.completedAt && task.undoUntil) {
          return {
            task_id: task.id,
            status: "already_completed" as const,
            completed_at: task.completedAt,
            undo_until: task.undoUntil,
          };
        }
        const completedAt = nowIso(this.clock());
        const undoUntil = new Date(this.clock() + UNDO_WINDOW_MS).toISOString();
        const updated: Task = {
          ...task,
          status: "completed",
          completedAt,
          undoUntil,
        };
        await this.db.tasks.update(updated);
        return {
          task_id: task.id,
          status: "completed" as const,
          completed_at: completedAt,
          undo_until: undoUntil,
        };
      },
      this.clock,
    );
    if (duplicate) return { ...value, status: "duplicate" };
    return value;
  }

  async undoComplete(raw: TaskUndoCompleteInput): Promise<TaskUndoCompleteOutput> {
    const input = TaskUndoCompleteInputSchema.parse(raw);
    const { value, duplicate } = await withIdempotency(
      this.db,
      "task.undo_complete",
      input.idempotency_key,
      input.task_id,
      async () => {
        const task = await this.db.tasks.findById(input.task_id);
        if (!task || task.userId !== input.user_id) {
          throw new DomainError("NOT_FOUND", `Task not found: ${input.task_id}`);
        }
        if (task.status !== "completed") {
          return { task_id: task.id, status: "open" as const };
        }
        if (!task.undoUntil || Date.parse(task.undoUntil) < this.clock()) {
          return { task_id: task.id, status: "undo_expired" as const };
        }
        await this.db.tasks.update({
          ...task,
          status: "open",
          completedAt: null,
          undoUntil: null,
        });
        return { task_id: task.id, status: "open" as const };
      },
      this.clock,
    );
    if (duplicate) return { ...value, status: "duplicate" };
    return value;
  }

  async snooze(raw: TaskSnoozeInput): Promise<TaskSnoozeOutput> {
    const input = TaskSnoozeInputSchema.parse(raw);
    const { value, duplicate } = await withIdempotency(
      this.db,
      "task.snooze",
      input.idempotency_key,
      input.task_id,
      async () => {
        const task = await this.db.tasks.findById(input.task_id);
        if (!task || task.userId !== input.user_id) {
          throw new DomainError("NOT_FOUND", `Task not found: ${input.task_id}`);
        }
        await this.db.tasks.update({
          ...task,
          status: "snoozed",
          snoozeUntil: input.snooze_until,
          dueAt: input.snooze_until,
        });
        return {
          task_id: task.id,
          status: "snoozed" as const,
          snooze_until: input.snooze_until,
        };
      },
      this.clock,
    );
    if (duplicate) return { ...value, status: "duplicate" };
    return value;
  }
}

export class ReminderService {
  constructor(
    private readonly db: UnitOfWork,
    private readonly clock: Clock = () => Date.now(),
  ) {}

  async create(raw: ReminderCreateInput): Promise<ReminderCreateOutput> {
    const input = ReminderCreateInputSchema.parse(raw);
    const bySource = await this.db.reminders.findBySourceEventId(
      input.source_event_id,
    );
    if (bySource) {
      return {
        reminder_id: bySource.id,
        status: "duplicate",
        title: bySource.title,
        remind_at: bySource.remindAt,
        timezone: bySource.timezone,
      };
    }

    const { value, duplicate } = await withIdempotency(
      this.db,
      "reminder.create",
      input.idempotency_key,
      null,
      async () => {
        const reminder: Reminder = {
          id: newId(),
          userId: input.user_id,
          taskId: input.task_id ?? null,
          title: input.title,
          remindAt: input.remind_at,
          timezone: input.timezone ?? DEFAULT_TIMEZONE,
          status: "scheduled",
          lastDeliveryAt: null,
          deliveryKey: null,
          sourceEventId: input.source_event_id,
          createdAt: nowIso(this.clock()),
          retryCount: 0,
          retryAt: null,
          lastError: null,
        };
        await this.db.reminders.insert(reminder);
        return {
          reminder_id: reminder.id,
          status: "scheduled" as const,
          title: reminder.title,
          remind_at: reminder.remindAt,
          timezone: reminder.timezone,
        };
      },
      this.clock,
    );
    if (duplicate) return { ...value, status: "duplicate" };
    return value;
  }

  async cancel(raw: ReminderCancelInput): Promise<ReminderCancelOutput> {
    const input = ReminderCancelInputSchema.parse(raw);
    const { value, duplicate } = await withIdempotency(
      this.db,
      "reminder.cancel",
      input.idempotency_key,
      input.reminder_id,
      async () => {
        const reminder = await this.db.reminders.findById(input.reminder_id);
        if (!reminder || reminder.userId !== input.user_id) {
          throw new DomainError(
            "NOT_FOUND",
            `Reminder not found: ${input.reminder_id}`,
          );
        }
        if (reminder.status === "cancelled") {
          return {
            reminder_id: reminder.id,
            status: "already_cancelled" as const,
          };
        }
        await this.db.reminders.update({ ...reminder, status: "cancelled" });
        return {
          reminder_id: reminder.id,
          status: "cancelled" as const,
        };
      },
      this.clock,
    );
    if (duplicate) return { ...value, status: "duplicate" };
    return value;
  }

  async snooze(raw: ReminderSnoozeInput): Promise<ReminderSnoozeOutput> {
    const input = ReminderSnoozeInputSchema.parse(raw);
    const { value, duplicate } = await withIdempotency(
      this.db,
      "reminder.snooze",
      input.idempotency_key,
      input.reminder_id,
      async () => {
        const reminder = await this.db.reminders.findById(input.reminder_id);
        if (!reminder || reminder.userId !== input.user_id) {
          throw new DomainError(
            "NOT_FOUND",
            `Reminder not found: ${input.reminder_id}`,
          );
        }
        await this.db.reminders.update({
          ...reminder,
          status: "snoozed",
          remindAt: input.snooze_until,
          deliveryKey: null,
          lastDeliveryAt: null,
        });
        return {
          reminder_id: reminder.id,
          status: "snoozed" as const,
          snooze_until: input.snooze_until,
        };
      },
      this.clock,
    );
    if (duplicate) return { ...value, status: "duplicate" };
    return value;
  }

  async markDelivered(
    raw: ReminderMarkDeliveredInput,
  ): Promise<ReminderMarkDeliveredOutput> {
    const input = ReminderMarkDeliveredInputSchema.parse(raw);
    const { value, duplicate } = await withIdempotency(
      this.db,
      "reminder.mark_delivered",
      input.delivery_key,
      input.reminder_id,
      async () => {
        const reminder = await this.db.reminders.findById(input.reminder_id);
        if (!reminder || reminder.userId !== input.user_id) {
          throw new DomainError(
            "NOT_FOUND",
            `Reminder not found: ${input.reminder_id}`,
          );
        }
        if (
          reminder.status === "delivered" &&
          reminder.deliveryKey === input.delivery_key
        ) {
          return {
            reminder_id: reminder.id,
            status: "duplicate" as const,
            last_delivery_at: reminder.lastDeliveryAt ?? input.delivered_at,
          };
        }
        await this.db.reminders.update({
          ...reminder,
          status: "delivered",
          lastDeliveryAt: input.delivered_at,
          deliveryKey: input.delivery_key,
          lastError: null,
        });
        return {
          reminder_id: reminder.id,
          status: "delivered" as const,
          last_delivery_at: input.delivered_at,
        };
      },
      this.clock,
    );
    if (duplicate) {
      return {
        reminder_id: value.reminder_id,
        status: "duplicate",
        last_delivery_at: value.last_delivery_at,
      };
    }
    return value;
  }

  async listDue(asOfIso?: string, limit = MAX_REMINDER_DISPATCH): Promise<Reminder[]> {
    return this.db.reminders.listDue({
      asOfIso: asOfIso ?? nowIso(this.clock()),
      limit,
    });
  }

  async markFailed(reminderId: string, error: string): Promise<Reminder> {
    const reminder = await this.db.reminders.findById(reminderId);
    if (!reminder) {
      throw new DomainError("NOT_FOUND", `Reminder not found: ${reminderId}`);
    }
    const retryCount = reminder.retryCount + 1;
    const status = retryCount >= MAX_RETRIES ? "dead" : "failed";
    const updated: Reminder = {
      ...reminder,
      status,
      retryCount,
      retryAt: status === "dead" ? null : nextRetryAt(retryCount - 1, this.clock()),
      lastError: error,
    };
    await this.db.reminders.update(updated);
    return updated;
  }

  buildDeliveryResponse(reminder: Reminder): LineResponseModel {
    return buildReplyOrPush({
      replyToken: null,
      replyTokenExpiresAt: null,
      userId: reminder.userId,
      text: `提醒：${reminder.title}`,
      quickReplies: [
        {
          label: "完成",
          data: `action=task.complete_from_reminder&reminder_id=${reminder.id}`,
        },
        {
          label: "晚一天",
          data: `action=reminder.snooze&reminder_id=${reminder.id}&days=1`,
        },
        {
          label: "稍後提醒",
          data: `action=reminder.snooze&reminder_id=${reminder.id}&hours=1`,
        },
      ],
      nowMs: this.clock(),
    });
  }
}

export class DailySummaryService {
  constructor(
    private readonly db: UnitOfWork,
    private readonly clock: Clock = () => Date.now(),
  ) {}

  async build(raw: SummaryDailyInput): Promise<SummaryDailyOutput> {
    const input = SummaryDailyInputSchema.parse(raw);
    const tz = input.timezone ?? DEFAULT_TIMEZONE;
    const asOf = input.as_of ? Date.parse(input.as_of) : this.clock();
    const date = formatDateInTimeZone(new Date(asOf), tz);

    const existing = await this.db.dailySummaries.find(input.user_id, date);
    if (existing) {
      return {
        user_id: input.user_id,
        date,
        timezone: tz,
        completed_count: 0,
        open_items: [],
        tomorrow_reminders: [],
        message_text: "",
        should_push: false,
        status: "duplicate",
      };
    }

    const { value, duplicate } = await withIdempotency(
      this.db,
      "summary.daily",
      input.idempotency_key,
      input.user_id,
      async () => {
        const { dayStartIso, dayEndIso, nextDayStartIso } = dayBoundsIso(date, tz);
        const tomorrowYmd = formatDateInTimeZone(
          new Date(Date.parse(nextDayStartIso) + 60_000),
          tz,
        );
        const tomorrowBounds = dayBoundsIso(tomorrowYmd, tz);

        const completed = await this.db.tasks.listCompletedOnDate({
          userId: input.user_id,
          dayStartIso,
          dayEndIso,
        });
        const openTasks = await this.db.tasks.listOpenForUserOnDate({
          userId: input.user_id,
          dayStartIso,
          dayEndIso,
        });
        const openReminders = (await this.db.reminders.listForUser(input.user_id)).filter(
          (r) =>
            r.status === "scheduled" ||
            r.status === "snoozed" ||
            r.status === "delivered" ||
            r.status === "failed",
        );
        // Open reminders that are still pending (not cancelled)
        const pendingReminders = openReminders.filter(
          (r) => r.status === "scheduled" || r.status === "snoozed",
        );
        const tomorrow = await this.db.reminders.listTomorrow({
          userId: input.user_id,
          dayStartIso: tomorrowBounds.dayStartIso,
          dayEndIso: tomorrowBounds.dayEndIso,
        });

        const open_items = [
          ...openTasks.map((t) => ({
            id: t.id,
            kind: "task" as const,
            title: t.title,
          })),
          ...pendingReminders.map((r) => ({
            id: r.id,
            kind: "reminder" as const,
            title: r.title,
          })),
        ];

        const completed_count = completed.length;
        const openTitles = open_items.map((i) => i.title);
        const message_text = [
          `今天完成 ${completed_count} 件。`,
          openTitles.length > 0
            ? `還有 ${openTitles.length} 件留著：${openTitles.join("、")}。`
            : "沒有未完成事項。",
          `明天有 ${tomorrow.length} 個提醒。`,
        ].join("\n");

        const should_push =
          completed_count > 0 || open_items.length > 0 || tomorrow.length > 0;

        if (!should_push) {
          return {
            user_id: input.user_id,
            date,
            timezone: tz,
            completed_count,
            open_items,
            tomorrow_reminders: tomorrow.map((r) => ({
              reminder_id: r.id,
              title: r.title,
              remind_at: r.remindAt,
            })),
            message_text,
            should_push: false,
            status: "empty_skipped" as const,
          };
        }

        await this.db.dailySummaries.insert({
          userId: input.user_id,
          date,
          deliveredAt: nowIso(this.clock()),
          idempotencyKey: input.idempotency_key,
        });

        return {
          user_id: input.user_id,
          date,
          timezone: tz,
          completed_count,
          open_items,
          tomorrow_reminders: tomorrow.map((r) => ({
            reminder_id: r.id,
            title: r.title,
            remind_at: r.remindAt,
          })),
          message_text,
          should_push: true,
          status: "built" as const,
        };
      },
      this.clock,
    );

    if (duplicate) {
      return { ...value, status: "duplicate", should_push: false };
    }
    return value;
  }
}

export class ResearchService {
  constructor(
    private readonly db: UnitOfWork,
    private readonly hermes: HermesResearchWorker,
    private readonly clock: Clock = () => Date.now(),
  ) {}

  async delegate(raw: ResearchDelegateInput): Promise<ResearchDelegateOutput> {
    const input = ResearchDelegateInputSchema.parse(raw);

    // Hard boundary: never accept LINE-shaped payloads
    if (looksLikeLineEvent(input) || looksLikeLineEvent(input.context)) {
      return {
        job_id: newId(),
        status: "rejected",
        message: "LINE events must not be sent to Hermes",
      };
    }

    const { value, duplicate } = await withIdempotency(
      this.db,
      "research.delegate",
      input.idempotency_key,
      null,
      async () => {
        const hermesResult = await this.hermes.enqueue(input);
        if (hermesResult.status === "rejected") {
          return hermesResult;
        }
        const job: ResearchJob = {
          id: newId(),
          userId: input.user_id,
          query: input.query,
          status: "queued",
          source: input.source ?? "openclaw",
          createdAt: nowIso(this.clock()),
          message: hermesResult.message,
        };
        await this.db.researchJobs.insert(job);
        return {
          job_id: job.id,
          status: "queued" as const,
          message: "research job queued for Hermes (internal only)",
        };
      },
      this.clock,
    );
    if (duplicate) return { ...value, status: "duplicate" };
    return value;
  }
}

export interface AssistantServices {
  events: EventReceiptService;
  inbox: InboxService;
  tasks: TaskService;
  reminders: ReminderService;
  summaries: DailySummaryService;
  research: ResearchService;
  openClaw: OpenClawAgent;
  db: UnitOfWork;
  clock: Clock;
}

export function createAssistantServices(params: {
  db: UnitOfWork;
  openClaw?: OpenClawAgent;
  hermes?: HermesResearchWorker;
  clock?: Clock;
}): AssistantServices {
  const clock = params.clock ?? (() => Date.now());
  const { DeterministicOpenClawStub, HermesResearchStub } = requireAgents();
  const openClaw =
    params.openClaw ??
    new DeterministicOpenClawStub(parseReminderDraftFromText, clock);
  const hermes = params.hermes ?? new HermesResearchStub();
  return {
    events: new EventReceiptService(params.db, clock),
    inbox: new InboxService(params.db, clock),
    tasks: new TaskService(params.db, clock),
    reminders: new ReminderService(params.db, clock),
    summaries: new DailySummaryService(params.db, clock),
    research: new ResearchService(params.db, hermes, clock),
    openClaw,
    db: params.db,
    clock,
  };
}

// Avoid circular import issues in CJS interop by local re-import pattern
import {
  DeterministicOpenClawStub as _DeterministicOpenClawStub,
  HermesResearchStub as _HermesResearchStub,
} from "./agents.js";

function requireAgents() {
  return {
    DeterministicOpenClawStub: _DeterministicOpenClawStub,
    HermesResearchStub: _HermesResearchStub,
  };
}

/**
 * Process a single normalized LINE event through OpenClaw → domain.
 * Hermes is never invoked with the raw LINE event.
 */
export async function handleNormalizedLineEvent(
  services: AssistantServices,
  event: NormalizedLineEvent,
  rawPayload: string = "",
): Promise<{
  processed: boolean;
  duplicate: boolean;
  responses: LineResponseModel[];
  actions: string[];
}> {
  const isFirst = await services.events.begin(event.sourceEventId, rawPayload);
  if (!isFirst) {
    return { processed: false, duplicate: true, responses: [], actions: [] };
  }

  const userId = event.userId;
  if (!userId) {
    await services.events.complete(event.sourceEventId);
    return { processed: true, duplicate: false, responses: [], actions: [] };
  }

  // Ensure user exists
  let user = await services.db.users.findByLineUserId(userId);
  if (!user) {
    user = {
      id: newId(),
      lineUserId: userId,
      displayName: userId,
      timezone: DEFAULT_TIMEZONE,
      dailySummaryTime: "21:00",
      createdAt: nowIso(services.clock()),
    };
    await services.db.users.upsert(user);
  }

  const responses: LineResponseModel[] = [];
  const actions: string[] = [];

  // Postback routing (domain, not Hermes)
  if (event.kind === "postback" && event.postbackData) {
    const result = await handlePostback(services, user, event);
    responses.push(...result.responses);
    actions.push(...result.actions);
    await services.events.complete(event.sourceEventId);
    return { processed: true, duplicate: false, responses, actions };
  }

  const intents = await services.openClaw.interpretLineEvent(event);
  for (const intent of intents) {
    if (intent.type === "reminder.create") {
      const out = await services.reminders.create({
        user_id: user.id,
        title: intent.title,
        remind_at: intent.remindAt,
        timezone: intent.timezone ?? user.timezone,
        source_event_id: event.sourceEventId,
        idempotency_key: `${event.idempotencyKey}:reminder.create`,
      });
      actions.push("reminder.create");
      const text = await services.openClaw.composeConfirmation({
        action: "reminder.create",
        payload: {
          title: out.title,
          remind_at: out.remind_at,
        },
      });
      responses.push(
        buildReplyOrPush({
          replyToken: event.replyToken,
          replyTokenExpiresAt: event.replyTokenExpiresAt,
          userId: user.lineUserId,
          text,
          quickReplies: [
            {
              label: "改時間",
              data: `action=reminder.reschedule&reminder_id=${out.reminder_id}`,
            },
            {
              label: "取消提醒",
              data: `action=reminder.cancel&reminder_id=${out.reminder_id}`,
            },
          ],
          nowMs: services.clock(),
        }),
      );
    } else if (intent.type === "task.create") {
      const out = await services.tasks.create({
        user_id: user.id,
        title: intent.title,
        due_at: intent.dueAt ?? null,
        source_event_id: event.sourceEventId,
        idempotency_key: `${event.idempotencyKey}:task.create`,
      });
      actions.push("task.create");
      const text = await services.openClaw.composeConfirmation({
        action: "task.create",
        payload: { title: out.title },
      });
      responses.push(
        buildReplyOrPush({
          replyToken: event.replyToken,
          replyTokenExpiresAt: event.replyTokenExpiresAt,
          userId: user.lineUserId,
          text,
          nowMs: services.clock(),
        }),
      );
    } else if (intent.type === "inbox.capture") {
      await services.inbox.capture({
        source_event_id: event.sourceEventId,
        user_id: user.id,
        content_type: intent.contentType,
        content: intent.content,
        received_at: event.receivedAt,
        idempotency_key: `${event.idempotencyKey}:inbox.capture`,
      });
      actions.push("inbox.capture");
      responses.push(
        buildReplyOrPush({
          replyToken: event.replyToken,
          replyTokenExpiresAt: event.replyTokenExpiresAt,
          userId: user.lineUserId,
          text: "先幫你收進收件匣了。",
          nowMs: services.clock(),
        }),
      );
    } else if (intent.type === "task.list_today") {
      const list = await services.tasks.listToday({
        user_id: user.id,
        timezone: user.timezone,
      });
      actions.push("task.list_today");
      const body =
        list.items.length === 0
          ? "今天沒有待辦。"
          : `今天待辦：\n${list.items.map((i, idx) => `${idx + 1}. ${i.title}`).join("\n")}`;
      responses.push(
        buildReplyOrPush({
          replyToken: event.replyToken,
          replyTokenExpiresAt: event.replyTokenExpiresAt,
          userId: user.lineUserId,
          text: body,
          nowMs: services.clock(),
        }),
      );
    }
  }

  await services.events.complete(event.sourceEventId);
  return { processed: true, duplicate: false, responses, actions };
}

async function handlePostback(
  services: AssistantServices,
  user: User,
  event: NormalizedLineEvent,
): Promise<{ responses: LineResponseModel[]; actions: string[] }> {
  const data = event.postbackData ?? "";
  const params = Object.fromEntries(
    data.split("&").map((pair) => {
      const [k, v] = pair.split("=");
      return [k ?? "", v ?? ""];
    }),
  );
  const action = params["action"];
  const responses: LineResponseModel[] = [];
  const actions: string[] = [];

  if (action === "reminder.cancel" && params["reminder_id"]) {
    const out = await services.reminders.cancel({
      user_id: user.id,
      reminder_id: params["reminder_id"],
      idempotency_key: event.idempotencyKey,
    });
    actions.push("reminder.cancel");
    responses.push(
      buildReplyOrPush({
        replyToken: event.replyToken,
        replyTokenExpiresAt: event.replyTokenExpiresAt,
        userId: user.lineUserId,
        text:
          out.status === "cancelled" || out.status === "duplicate"
            ? "已取消提醒。"
            : "提醒已是取消狀態。",
        nowMs: services.clock(),
      }),
    );
  } else if (action === "reminder.snooze" && params["reminder_id"]) {
    const days = params["days"] ? Number(params["days"]) : 0;
    const hours = params["hours"] ? Number(params["hours"]) : 0;
    const base = nowIso(services.clock());
    const until =
      days > 0
        ? addDaysIso(base, days)
        : new Date(services.clock() + hours * 3600_000).toISOString();
    await services.reminders.snooze({
      user_id: user.id,
      reminder_id: params["reminder_id"],
      snooze_until: until,
      idempotency_key: event.idempotencyKey,
    });
    actions.push("reminder.snooze");
    responses.push(
      buildReplyOrPush({
        replyToken: event.replyToken,
        replyTokenExpiresAt: event.replyTokenExpiresAt,
        userId: user.lineUserId,
        text: `已延後到 ${until}`,
        nowMs: services.clock(),
      }),
    );
  } else if (action === "task.complete" && params["task_id"]) {
    const out = await services.tasks.complete({
      user_id: user.id,
      task_id: params["task_id"],
      idempotency_key: event.idempotencyKey,
    });
    actions.push("task.complete");
    responses.push(
      buildReplyOrPush({
        replyToken: event.replyToken,
        replyTokenExpiresAt: event.replyTokenExpiresAt,
        userId: user.lineUserId,
        text: "完成了。",
        quickReplies: [
          {
            label: "Undo",
            data: `action=task.undo_complete&task_id=${out.task_id}`,
          },
        ],
        nowMs: services.clock(),
      }),
    );
  } else if (action === "task.undo_complete" && params["task_id"]) {
    const out = await services.tasks.undoComplete({
      user_id: user.id,
      task_id: params["task_id"],
      idempotency_key: event.idempotencyKey,
    });
    actions.push("task.undo_complete");
    responses.push(
      buildReplyOrPush({
        replyToken: event.replyToken,
        replyTokenExpiresAt: event.replyTokenExpiresAt,
        userId: user.lineUserId,
        text:
          out.status === "open"
            ? "已復原為未完成。"
            : out.status === "undo_expired"
              ? "復原時限已過。"
              : "已處理。",
        nowMs: services.clock(),
      }),
    );
  } else if (action === "task.complete_from_reminder" && params["reminder_id"]) {
    // Completing from reminder delivery: cancel reminder lifecycle as delivered-done
    const reminder = await services.db.reminders.findById(params["reminder_id"]);
    if (reminder && reminder.taskId) {
      await services.tasks.complete({
        user_id: user.id,
        task_id: reminder.taskId,
        idempotency_key: `${event.idempotencyKey}:task`,
      });
      actions.push("task.complete");
    }
    await services.reminders.cancel({
      user_id: user.id,
      reminder_id: params["reminder_id"],
      idempotency_key: `${event.idempotencyKey}:cancel`,
    });
    actions.push("reminder.cancel");
    responses.push(
      buildReplyOrPush({
        replyToken: event.replyToken,
        replyTokenExpiresAt: event.replyTokenExpiresAt,
        userId: user.lineUserId,
        text: "好，這件算完成了。",
        nowMs: services.clock(),
      }),
    );
  }

  return { responses, actions };
}

export { parseReminderDraftFromText };
