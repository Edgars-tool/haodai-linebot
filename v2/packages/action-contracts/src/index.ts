import { z } from "zod";

/** Shared primitives */
export const IsoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime());

export const UuidSchema = z.string().uuid();

export const UserIdSchema = z.string().min(1);

export const IdempotencyKeySchema = z.string().min(8).max(200);

export const ActionErrorSchema = z.object({
  code: z.enum([
    "VALIDATION_ERROR",
    "NOT_FOUND",
    "CONFLICT",
    "IDEMPOTENT_REPLAY",
    "FORBIDDEN",
    "INTERNAL",
    "UNSUPPORTED",
  ]),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ActionError = z.infer<typeof ActionErrorSchema>;

export type ConfirmationPolicy =
  | "none"
  | "soft"
  | "explicit"
  | "button_confirm";

export type ExecutorDesignation =
  | "domain"
  | "openclaw"
  | "n8n"
  | "hermes_internal";

export interface ActionContractMeta {
  name: string;
  confirmationPolicy: ConfirmationPolicy;
  requiresIdempotency: boolean;
  executor: ExecutorDesignation;
  description: string;
}

/* -------------------------------------------------------------------------- */
/* inbox.capture                                                              */
/* -------------------------------------------------------------------------- */

export const InboxCaptureInputSchema = z.object({
  source_event_id: z.string().min(1),
  user_id: UserIdSchema,
  content_type: z.enum(["text", "image", "audio", "url", "forwarded"]),
  content: z.string().min(1),
  received_at: IsoDateTimeSchema,
  idempotency_key: IdempotencyKeySchema,
});

export const InboxCaptureOutputSchema = z.object({
  inbox_item_id: UuidSchema,
  status: z.enum(["captured", "duplicate"]),
  classified_as: z
    .enum(["unclassified", "task", "reminder", "note"])
    .default("unclassified"),
});

export const inboxCaptureMeta: ActionContractMeta = {
  name: "inbox.capture",
  confirmationPolicy: "none",
  requiresIdempotency: true,
  executor: "domain",
  description: "Capture raw user content before classification",
};

/* -------------------------------------------------------------------------- */
/* task.create                                                                */
/* -------------------------------------------------------------------------- */

export const TaskCreateInputSchema = z.object({
  user_id: UserIdSchema,
  title: z.string().min(1).max(500),
  due_at: IsoDateTimeSchema.nullable().optional(),
  source_event_id: z.string().min(1),
  idempotency_key: IdempotencyKeySchema,
});

export const TaskCreateOutputSchema = z.object({
  task_id: UuidSchema,
  status: z.enum(["open", "duplicate"]),
  title: z.string(),
  due_at: IsoDateTimeSchema.nullable().optional(),
});

export const taskCreateMeta: ActionContractMeta = {
  name: "task.create",
  confirmationPolicy: "soft",
  requiresIdempotency: true,
  executor: "domain",
  description: "Create a task from natural language or button",
};

/* -------------------------------------------------------------------------- */
/* task.list_today                                                            */
/* -------------------------------------------------------------------------- */

export const TaskListTodayInputSchema = z.object({
  user_id: UserIdSchema,
  timezone: z.string().default("Asia/Taipei"),
  as_of: IsoDateTimeSchema.optional(),
});

export const TaskListTodayItemSchema = z.object({
  task_id: UuidSchema,
  title: z.string(),
  due_at: IsoDateTimeSchema.nullable().optional(),
  status: z.enum(["open", "completed", "cancelled", "snoozed"]),
});

export const TaskListTodayOutputSchema = z.object({
  timezone: z.string(),
  date: z.string(),
  items: z.array(TaskListTodayItemSchema),
});

export const taskListTodayMeta: ActionContractMeta = {
  name: "task.list_today",
  confirmationPolicy: "none",
  requiresIdempotency: false,
  executor: "domain",
  description: "List incomplete tasks relevant to today",
};

/* -------------------------------------------------------------------------- */
/* task.complete                                                              */
/* -------------------------------------------------------------------------- */

export const TaskCompleteInputSchema = z.object({
  user_id: UserIdSchema,
  task_id: UuidSchema,
  idempotency_key: IdempotencyKeySchema,
});

export const TaskCompleteOutputSchema = z.object({
  task_id: UuidSchema,
  status: z.enum(["completed", "already_completed", "duplicate"]),
  completed_at: IsoDateTimeSchema,
  undo_until: IsoDateTimeSchema,
});

export const taskCompleteMeta: ActionContractMeta = {
  name: "task.complete",
  confirmationPolicy: "button_confirm",
  requiresIdempotency: true,
  executor: "domain",
  description: "Mark a task complete with short undo window",
};

/* -------------------------------------------------------------------------- */
/* task.snooze                                                                */
/* -------------------------------------------------------------------------- */

export const TaskSnoozeInputSchema = z.object({
  user_id: UserIdSchema,
  task_id: UuidSchema,
  snooze_until: IsoDateTimeSchema,
  idempotency_key: IdempotencyKeySchema,
});

export const TaskSnoozeOutputSchema = z.object({
  task_id: UuidSchema,
  status: z.enum(["snoozed", "duplicate"]),
  snooze_until: IsoDateTimeSchema,
});

export const taskSnoozeMeta: ActionContractMeta = {
  name: "task.snooze",
  confirmationPolicy: "button_confirm",
  requiresIdempotency: true,
  executor: "domain",
  description: "Defer a task to a later time",
};

/* -------------------------------------------------------------------------- */
/* task.undo_complete                                                         */
/* -------------------------------------------------------------------------- */

export const TaskUndoCompleteInputSchema = z.object({
  user_id: UserIdSchema,
  task_id: UuidSchema,
  idempotency_key: IdempotencyKeySchema,
});

export const TaskUndoCompleteOutputSchema = z.object({
  task_id: UuidSchema,
  status: z.enum(["open", "undo_expired", "duplicate"]),
});

export const taskUndoCompleteMeta: ActionContractMeta = {
  name: "task.undo_complete",
  confirmationPolicy: "button_confirm",
  requiresIdempotency: true,
  executor: "domain",
  description: "Undo a recent task completion within the undo window",
};

/* -------------------------------------------------------------------------- */
/* reminder.create                                                            */
/* -------------------------------------------------------------------------- */

export const ReminderCreateInputSchema = z.object({
  user_id: UserIdSchema,
  title: z.string().min(1).max(500),
  remind_at: IsoDateTimeSchema,
  timezone: z.string().default("Asia/Taipei"),
  source_event_id: z.string().min(1),
  task_id: UuidSchema.optional(),
  idempotency_key: IdempotencyKeySchema,
});

export const ReminderCreateOutputSchema = z.object({
  reminder_id: UuidSchema,
  status: z.enum(["scheduled", "duplicate"]),
  title: z.string(),
  remind_at: IsoDateTimeSchema,
  timezone: z.string(),
});

export const reminderCreateMeta: ActionContractMeta = {
  name: "reminder.create",
  confirmationPolicy: "soft",
  requiresIdempotency: true,
  executor: "domain",
  description: "Schedule a reminder",
};

/* -------------------------------------------------------------------------- */
/* reminder.cancel                                                            */
/* -------------------------------------------------------------------------- */

export const ReminderCancelInputSchema = z.object({
  user_id: UserIdSchema,
  reminder_id: UuidSchema,
  idempotency_key: IdempotencyKeySchema,
});

export const ReminderCancelOutputSchema = z.object({
  reminder_id: UuidSchema,
  status: z.enum(["cancelled", "already_cancelled", "duplicate"]),
});

export const reminderCancelMeta: ActionContractMeta = {
  name: "reminder.cancel",
  confirmationPolicy: "button_confirm",
  requiresIdempotency: true,
  executor: "domain",
  description: "Cancel a scheduled reminder",
};

/* -------------------------------------------------------------------------- */
/* reminder.snooze                                                            */
/* -------------------------------------------------------------------------- */

export const ReminderSnoozeInputSchema = z.object({
  user_id: UserIdSchema,
  reminder_id: UuidSchema,
  snooze_until: IsoDateTimeSchema,
  idempotency_key: IdempotencyKeySchema,
});

export const ReminderSnoozeOutputSchema = z.object({
  reminder_id: UuidSchema,
  status: z.enum(["snoozed", "duplicate"]),
  snooze_until: IsoDateTimeSchema,
});

export const reminderSnoozeMeta: ActionContractMeta = {
  name: "reminder.snooze",
  confirmationPolicy: "button_confirm",
  requiresIdempotency: true,
  executor: "domain",
  description: "Snooze a reminder to a later time",
};

/* -------------------------------------------------------------------------- */
/* reminder.mark_delivered                                                    */
/* -------------------------------------------------------------------------- */

export const ReminderMarkDeliveredInputSchema = z.object({
  user_id: UserIdSchema,
  reminder_id: UuidSchema,
  delivery_key: IdempotencyKeySchema,
  delivered_at: IsoDateTimeSchema,
});

export const ReminderMarkDeliveredOutputSchema = z.object({
  reminder_id: UuidSchema,
  status: z.enum(["delivered", "duplicate", "failed"]),
  last_delivery_at: IsoDateTimeSchema.optional(),
});

export const reminderMarkDeliveredMeta: ActionContractMeta = {
  name: "reminder.mark_delivered",
  confirmationPolicy: "none",
  requiresIdempotency: true,
  executor: "n8n",
  description: "Record a successful reminder delivery (n8n dispatch)",
};

/* -------------------------------------------------------------------------- */
/* summary.daily                                                              */
/* -------------------------------------------------------------------------- */

export const SummaryDailyInputSchema = z.object({
  user_id: UserIdSchema,
  timezone: z.string().default("Asia/Taipei"),
  as_of: IsoDateTimeSchema.optional(),
  idempotency_key: IdempotencyKeySchema,
});

export const SummaryDailyOutputSchema = z.object({
  user_id: UserIdSchema,
  date: z.string(),
  timezone: z.string(),
  completed_count: z.number().int().nonnegative(),
  open_items: z.array(
    z.object({
      id: UuidSchema,
      kind: z.enum(["task", "reminder"]),
      title: z.string(),
    }),
  ),
  tomorrow_reminders: z.array(
    z.object({
      reminder_id: UuidSchema,
      title: z.string(),
      remind_at: IsoDateTimeSchema,
    }),
  ),
  message_text: z.string(),
  should_push: z.boolean(),
  status: z.enum(["built", "duplicate", "empty_skipped"]),
});

export const summaryDailyMeta: ActionContractMeta = {
  name: "summary.daily",
  confirmationPolicy: "none",
  requiresIdempotency: true,
  executor: "n8n",
  description: "Build deterministic daily wrap-up content",
};

/* -------------------------------------------------------------------------- */
/* research.delegate — interface / stub only                                  */
/* -------------------------------------------------------------------------- */

export const ResearchDelegateInputSchema = z.object({
  user_id: UserIdSchema,
  query: z.string().min(1),
  context: z.record(z.unknown()).optional(),
  idempotency_key: IdempotencyKeySchema,
  /** Must never contain raw LINE webhook payloads */
  source: z.enum(["openclaw", "manual", "internal"]).default("openclaw"),
});

export const ResearchDelegateOutputSchema = z.object({
  job_id: UuidSchema,
  status: z.enum(["queued", "duplicate", "rejected"]),
  message: z.string(),
});

export const researchDelegateMeta: ActionContractMeta = {
  name: "research.delegate",
  confirmationPolicy: "explicit",
  requiresIdempotency: true,
  executor: "hermes_internal",
  description:
    "Delegate deep research to Hermes (internal worker only; never LINE ingress)",
};

/* -------------------------------------------------------------------------- */
/* Registry                                                                   */
/* -------------------------------------------------------------------------- */

export const ACTION_CONTRACTS = {
  "inbox.capture": {
    meta: inboxCaptureMeta,
    input: InboxCaptureInputSchema,
    output: InboxCaptureOutputSchema,
  },
  "task.create": {
    meta: taskCreateMeta,
    input: TaskCreateInputSchema,
    output: TaskCreateOutputSchema,
  },
  "task.list_today": {
    meta: taskListTodayMeta,
    input: TaskListTodayInputSchema,
    output: TaskListTodayOutputSchema,
  },
  "task.complete": {
    meta: taskCompleteMeta,
    input: TaskCompleteInputSchema,
    output: TaskCompleteOutputSchema,
  },
  "task.snooze": {
    meta: taskSnoozeMeta,
    input: TaskSnoozeInputSchema,
    output: TaskSnoozeOutputSchema,
  },
  "task.undo_complete": {
    meta: taskUndoCompleteMeta,
    input: TaskUndoCompleteInputSchema,
    output: TaskUndoCompleteOutputSchema,
  },
  "reminder.create": {
    meta: reminderCreateMeta,
    input: ReminderCreateInputSchema,
    output: ReminderCreateOutputSchema,
  },
  "reminder.cancel": {
    meta: reminderCancelMeta,
    input: ReminderCancelInputSchema,
    output: ReminderCancelOutputSchema,
  },
  "reminder.snooze": {
    meta: reminderSnoozeMeta,
    input: ReminderSnoozeInputSchema,
    output: ReminderSnoozeOutputSchema,
  },
  "reminder.mark_delivered": {
    meta: reminderMarkDeliveredMeta,
    input: ReminderMarkDeliveredInputSchema,
    output: ReminderMarkDeliveredOutputSchema,
  },
  "summary.daily": {
    meta: summaryDailyMeta,
    input: SummaryDailyInputSchema,
    output: SummaryDailyOutputSchema,
  },
  "research.delegate": {
    meta: researchDelegateMeta,
    input: ResearchDelegateInputSchema,
    output: ResearchDelegateOutputSchema,
  },
} as const;

export type ActionName = keyof typeof ACTION_CONTRACTS;

export type InboxCaptureInput = z.infer<typeof InboxCaptureInputSchema>;
export type InboxCaptureOutput = z.infer<typeof InboxCaptureOutputSchema>;
export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>;
export type TaskCreateOutput = z.infer<typeof TaskCreateOutputSchema>;
export type TaskListTodayInput = z.infer<typeof TaskListTodayInputSchema>;
export type TaskListTodayOutput = z.infer<typeof TaskListTodayOutputSchema>;
export type TaskCompleteInput = z.infer<typeof TaskCompleteInputSchema>;
export type TaskCompleteOutput = z.infer<typeof TaskCompleteOutputSchema>;
export type TaskSnoozeInput = z.infer<typeof TaskSnoozeInputSchema>;
export type TaskSnoozeOutput = z.infer<typeof TaskSnoozeOutputSchema>;
export type TaskUndoCompleteInput = z.infer<typeof TaskUndoCompleteInputSchema>;
export type TaskUndoCompleteOutput = z.infer<typeof TaskUndoCompleteOutputSchema>;
export type ReminderCreateInput = z.infer<typeof ReminderCreateInputSchema>;
export type ReminderCreateOutput = z.infer<typeof ReminderCreateOutputSchema>;
export type ReminderCancelInput = z.infer<typeof ReminderCancelInputSchema>;
export type ReminderCancelOutput = z.infer<typeof ReminderCancelOutputSchema>;
export type ReminderSnoozeInput = z.infer<typeof ReminderSnoozeInputSchema>;
export type ReminderSnoozeOutput = z.infer<typeof ReminderSnoozeOutputSchema>;
export type ReminderMarkDeliveredInput = z.infer<
  typeof ReminderMarkDeliveredInputSchema
>;
export type ReminderMarkDeliveredOutput = z.infer<
  typeof ReminderMarkDeliveredOutputSchema
>;
export type SummaryDailyInput = z.infer<typeof SummaryDailyInputSchema>;
export type SummaryDailyOutput = z.infer<typeof SummaryDailyOutputSchema>;
export type ResearchDelegateInput = z.infer<typeof ResearchDelegateInputSchema>;
export type ResearchDelegateOutput = z.infer<
  typeof ResearchDelegateOutputSchema
>;

export function parseActionInput<N extends ActionName>(
  name: N,
  raw: unknown,
): z.infer<(typeof ACTION_CONTRACTS)[N]["input"]> {
  return ACTION_CONTRACTS[name].input.parse(raw) as z.infer<
    (typeof ACTION_CONTRACTS)[N]["input"]
  >;
}

export function safeParseActionInput<N extends ActionName>(
  name: N,
  raw: unknown,
) {
  return ACTION_CONTRACTS[name].input.safeParse(raw);
}
