import type {
  ActionReceipt,
  DailySummaryReceipt,
  EventReceipt,
  FailedJob,
  InboxItem,
  Reminder,
  ResearchJob,
  Task,
  User,
} from "./entities.js";

/**
 * Supabase-compatible repository interfaces.
 * Production adapters may implement these against Postgres/Supabase;
 * tests use InMemoryRepositories.
 */

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByLineUserId(lineUserId: string): Promise<User | null>;
  upsert(user: User): Promise<User>;
  listDueForDailySummary(params: {
    timezone: string;
    localTimeHHmm: string;
  }): Promise<User[]>;
}

export interface EventReceiptRepository {
  findByLineEventId(lineEventId: string): Promise<EventReceipt | null>;
  insert(receipt: EventReceipt): Promise<EventReceipt>;
  markProcessed(lineEventId: string, processedAt: string): Promise<void>;
  markDuplicate(lineEventId: string): Promise<void>;
}

export interface InboxItemRepository {
  insert(item: InboxItem): Promise<InboxItem>;
  findById(id: string): Promise<InboxItem | null>;
  findBySourceEventId(sourceEventId: string): Promise<InboxItem | null>;
}

export interface TaskRepository {
  insert(task: Task): Promise<Task>;
  update(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findBySourceEventId(sourceEventId: string): Promise<Task | null>;
  listForUser(userId: string): Promise<Task[]>;
  listOpenForUserOnDate(params: {
    userId: string;
    dayStartIso: string;
    dayEndIso: string;
  }): Promise<Task[]>;
  listCompletedOnDate(params: {
    userId: string;
    dayStartIso: string;
    dayEndIso: string;
  }): Promise<Task[]>;
}

export interface ReminderRepository {
  insert(reminder: Reminder): Promise<Reminder>;
  update(reminder: Reminder): Promise<Reminder>;
  findById(id: string): Promise<Reminder | null>;
  findBySourceEventId(sourceEventId: string): Promise<Reminder | null>;
  listDue(params: { asOfIso: string; limit: number }): Promise<Reminder[]>;
  listForUser(userId: string): Promise<Reminder[]>;
  listTomorrow(params: {
    userId: string;
    dayStartIso: string;
    dayEndIso: string;
  }): Promise<Reminder[]>;
}

export interface ActionReceiptRepository {
  findByKey(idempotencyKey: string): Promise<ActionReceipt | null>;
  insert(receipt: ActionReceipt): Promise<ActionReceipt>;
}

export interface DailySummaryReceiptRepository {
  find(userId: string, date: string): Promise<DailySummaryReceipt | null>;
  insert(receipt: DailySummaryReceipt): Promise<DailySummaryReceipt>;
}

export interface FailedJobRepository {
  insert(job: FailedJob): Promise<FailedJob>;
  update(job: FailedJob): Promise<FailedJob>;
  listRetryable(asOfIso: string): Promise<FailedJob[]>;
  findById(id: string): Promise<FailedJob | null>;
}

export interface ResearchJobRepository {
  insert(job: ResearchJob): Promise<ResearchJob>;
  findById(id: string): Promise<ResearchJob | null>;
}

export interface UnitOfWork {
  users: UserRepository;
  eventReceipts: EventReceiptRepository;
  inboxItems: InboxItemRepository;
  tasks: TaskRepository;
  reminders: ReminderRepository;
  actionReceipts: ActionReceiptRepository;
  dailySummaries: DailySummaryReceiptRepository;
  failedJobs: FailedJobRepository;
  researchJobs: ResearchJobRepository;
}
