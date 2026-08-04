export type TaskStatus = "open" | "completed" | "cancelled" | "snoozed";
export type ReminderStatus =
  | "scheduled"
  | "delivered"
  | "cancelled"
  | "snoozed"
  | "failed"
  | "dead";
export type InboxStatus = "open" | "classified" | "archived";
export type EventReceiptStatus = "received" | "processed" | "duplicate" | "failed";
export type FailedJobKind = "reminder_delivery" | "daily_summary" | "internal";
export type FailedJobStatus = "pending" | "retrying" | "dead" | "resolved";

export interface User {
  id: string;
  lineUserId: string;
  displayName: string;
  timezone: string;
  dailySummaryTime: string; // HH:mm in user timezone
  createdAt: string;
}

export interface EventReceipt {
  lineEventId: string;
  receivedAt: string;
  processedAt: string | null;
  status: EventReceiptStatus;
  payloadHash: string;
}

export interface InboxItem {
  id: string;
  userId: string;
  sourceEventId: string;
  contentType: "text" | "image" | "audio" | "url" | "forwarded";
  rawContent: string;
  classifiedAs: "unclassified" | "task" | "reminder" | "note";
  status: InboxStatus;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  dueAt: string | null;
  status: TaskStatus;
  sourceEventId: string;
  createdAt: string;
  completedAt: string | null;
  undoUntil: string | null;
  snoozeUntil: string | null;
}

export interface Reminder {
  id: string;
  userId: string;
  taskId: string | null;
  title: string;
  remindAt: string;
  timezone: string;
  status: ReminderStatus;
  lastDeliveryAt: string | null;
  deliveryKey: string | null;
  sourceEventId: string;
  createdAt: string;
  retryCount: number;
  retryAt: string | null;
  lastError: string | null;
}

export interface ActionReceipt {
  idempotencyKey: string;
  actionName: string;
  resourceId: string | null;
  result: unknown;
  createdAt: string;
}

export interface DailySummaryReceipt {
  userId: string;
  date: string; // YYYY-MM-DD in user tz
  deliveredAt: string;
  idempotencyKey: string;
}

export interface FailedJob {
  id: string;
  kind: FailedJobKind;
  resourceId: string;
  userId: string;
  retryCount: number;
  maxRetries: number;
  retryAt: string;
  status: FailedJobStatus;
  lastError: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchJob {
  id: string;
  userId: string;
  query: string;
  status: "queued" | "running" | "completed" | "failed" | "rejected";
  source: "openclaw" | "manual" | "internal";
  createdAt: string;
  message: string;
}
