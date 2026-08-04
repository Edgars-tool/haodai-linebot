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
import type {
  ActionReceiptRepository,
  DailySummaryReceiptRepository,
  EventReceiptRepository,
  FailedJobRepository,
  InboxItemRepository,
  ReminderRepository,
  ResearchJobRepository,
  TaskRepository,
  UnitOfWork,
  UserRepository,
} from "./repositories.js";

export class InMemoryUserRepository implements UserRepository {
  private readonly byId = new Map<string, User>();
  private readonly byLine = new Map<string, string>();

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async findByLineUserId(lineUserId: string): Promise<User | null> {
    const id = this.byLine.get(lineUserId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async upsert(user: User): Promise<User> {
    this.byId.set(user.id, user);
    this.byLine.set(user.lineUserId, user.id);
    return user;
  }

  async listDueForDailySummary(params: {
    timezone: string;
    localTimeHHmm: string;
  }): Promise<User[]> {
    return [...this.byId.values()].filter(
      (u) =>
        u.timezone === params.timezone &&
        u.dailySummaryTime === params.localTimeHHmm,
    );
  }
}

export class InMemoryEventReceiptRepository implements EventReceiptRepository {
  private readonly byId = new Map<string, EventReceipt>();

  async findByLineEventId(lineEventId: string): Promise<EventReceipt | null> {
    return this.byId.get(lineEventId) ?? null;
  }

  async insert(receipt: EventReceipt): Promise<EventReceipt> {
    if (this.byId.has(receipt.lineEventId)) {
      throw new Error(`EventReceipt already exists: ${receipt.lineEventId}`);
    }
    this.byId.set(receipt.lineEventId, receipt);
    return receipt;
  }

  async markProcessed(lineEventId: string, processedAt: string): Promise<void> {
    const existing = this.byId.get(lineEventId);
    if (!existing) return;
    this.byId.set(lineEventId, {
      ...existing,
      status: "processed",
      processedAt,
    });
  }

  async markDuplicate(lineEventId: string): Promise<void> {
    const existing = this.byId.get(lineEventId);
    if (!existing) return;
    this.byId.set(lineEventId, { ...existing, status: "duplicate" });
  }
}

export class InMemoryInboxItemRepository implements InboxItemRepository {
  private readonly byId = new Map<string, InboxItem>();
  private readonly bySource = new Map<string, string>();

  async insert(item: InboxItem): Promise<InboxItem> {
    this.byId.set(item.id, item);
    this.bySource.set(item.sourceEventId, item.id);
    return item;
  }

  async findById(id: string): Promise<InboxItem | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySourceEventId(sourceEventId: string): Promise<InboxItem | null> {
    const id = this.bySource.get(sourceEventId);
    return id ? (this.byId.get(id) ?? null) : null;
  }
}

export class InMemoryTaskRepository implements TaskRepository {
  private readonly byId = new Map<string, Task>();
  private readonly bySource = new Map<string, string>();

  async insert(task: Task): Promise<Task> {
    this.byId.set(task.id, task);
    this.bySource.set(task.sourceEventId, task.id);
    return task;
  }

  async update(task: Task): Promise<Task> {
    this.byId.set(task.id, task);
    return task;
  }

  async findById(id: string): Promise<Task | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySourceEventId(sourceEventId: string): Promise<Task | null> {
    const id = this.bySource.get(sourceEventId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async listForUser(userId: string): Promise<Task[]> {
    return [...this.byId.values()].filter((t) => t.userId === userId);
  }

  async listOpenForUserOnDate(params: {
    userId: string;
    dayStartIso: string;
    dayEndIso: string;
  }): Promise<Task[]> {
    const start = Date.parse(params.dayStartIso);
    const end = Date.parse(params.dayEndIso);
    return [...this.byId.values()].filter((t) => {
      if (t.userId !== params.userId) return false;
      if (t.status === "completed" || t.status === "cancelled") return false;
      if (t.status === "snoozed" && t.snoozeUntil) {
        return Date.parse(t.snoozeUntil) <= end;
      }
      if (!t.dueAt) return true; // undated open tasks show in today
      const due = Date.parse(t.dueAt);
      return due >= start && due <= end;
    });
  }

  async listCompletedOnDate(params: {
    userId: string;
    dayStartIso: string;
    dayEndIso: string;
  }): Promise<Task[]> {
    const start = Date.parse(params.dayStartIso);
    const end = Date.parse(params.dayEndIso);
    return [...this.byId.values()].filter((t) => {
      if (t.userId !== params.userId || t.status !== "completed" || !t.completedAt)
        return false;
      const c = Date.parse(t.completedAt);
      return c >= start && c <= end;
    });
  }
}

export class InMemoryReminderRepository implements ReminderRepository {
  private readonly byId = new Map<string, Reminder>();
  private readonly bySource = new Map<string, string>();

  async insert(reminder: Reminder): Promise<Reminder> {
    this.byId.set(reminder.id, reminder);
    this.bySource.set(reminder.sourceEventId, reminder.id);
    return reminder;
  }

  async update(reminder: Reminder): Promise<Reminder> {
    this.byId.set(reminder.id, reminder);
    return reminder;
  }

  async findById(id: string): Promise<Reminder | null> {
    return this.byId.get(id) ?? null;
  }

  async findBySourceEventId(sourceEventId: string): Promise<Reminder | null> {
    const id = this.bySource.get(sourceEventId);
    return id ? (this.byId.get(id) ?? null) : null;
  }

  async listDue(params: { asOfIso: string; limit: number }): Promise<Reminder[]> {
    const asOf = Date.parse(params.asOfIso);
    return [...this.byId.values()]
      .filter(
        (r) =>
          (r.status === "scheduled" || r.status === "snoozed" || r.status === "failed") &&
          Date.parse(r.remindAt) <= asOf,
      )
      .sort((a, b) => Date.parse(a.remindAt) - Date.parse(b.remindAt))
      .slice(0, params.limit);
  }

  async listForUser(userId: string): Promise<Reminder[]> {
    return [...this.byId.values()].filter((r) => r.userId === userId);
  }

  async listTomorrow(params: {
    userId: string;
    dayStartIso: string;
    dayEndIso: string;
  }): Promise<Reminder[]> {
    const start = Date.parse(params.dayStartIso);
    const end = Date.parse(params.dayEndIso);
    return [...this.byId.values()].filter((r) => {
      if (r.userId !== params.userId) return false;
      if (r.status === "cancelled" || r.status === "dead") return false;
      const t = Date.parse(r.remindAt);
      return t >= start && t <= end;
    });
  }
}

export class InMemoryActionReceiptRepository implements ActionReceiptRepository {
  private readonly byKey = new Map<string, ActionReceipt>();

  async findByKey(idempotencyKey: string): Promise<ActionReceipt | null> {
    return this.byKey.get(idempotencyKey) ?? null;
  }

  async insert(receipt: ActionReceipt): Promise<ActionReceipt> {
    this.byKey.set(receipt.idempotencyKey, receipt);
    return receipt;
  }
}

export class InMemoryDailySummaryReceiptRepository
  implements DailySummaryReceiptRepository
{
  private readonly byKey = new Map<string, DailySummaryReceipt>();

  private key(userId: string, date: string): string {
    return `${userId}:${date}`;
  }

  async find(userId: string, date: string): Promise<DailySummaryReceipt | null> {
    return this.byKey.get(this.key(userId, date)) ?? null;
  }

  async insert(receipt: DailySummaryReceipt): Promise<DailySummaryReceipt> {
    this.byKey.set(this.key(receipt.userId, receipt.date), receipt);
    return receipt;
  }
}

export class InMemoryFailedJobRepository implements FailedJobRepository {
  private readonly byId = new Map<string, FailedJob>();

  async insert(job: FailedJob): Promise<FailedJob> {
    this.byId.set(job.id, job);
    return job;
  }

  async update(job: FailedJob): Promise<FailedJob> {
    this.byId.set(job.id, job);
    return job;
  }

  async listRetryable(asOfIso: string): Promise<FailedJob[]> {
    const asOf = Date.parse(asOfIso);
    return [...this.byId.values()].filter(
      (j) =>
        (j.status === "pending" || j.status === "retrying") &&
        Date.parse(j.retryAt) <= asOf &&
        j.retryCount < j.maxRetries,
    );
  }

  async findById(id: string): Promise<FailedJob | null> {
    return this.byId.get(id) ?? null;
  }
}

export class InMemoryResearchJobRepository implements ResearchJobRepository {
  private readonly byId = new Map<string, ResearchJob>();

  async insert(job: ResearchJob): Promise<ResearchJob> {
    this.byId.set(job.id, job);
    return job;
  }

  async findById(id: string): Promise<ResearchJob | null> {
    return this.byId.get(id) ?? null;
  }
}

export function createInMemoryUnitOfWork(): UnitOfWork {
  return {
    users: new InMemoryUserRepository(),
    eventReceipts: new InMemoryEventReceiptRepository(),
    inboxItems: new InMemoryInboxItemRepository(),
    tasks: new InMemoryTaskRepository(),
    reminders: new InMemoryReminderRepository(),
    actionReceipts: new InMemoryActionReceiptRepository(),
    dailySummaries: new InMemoryDailySummaryReceiptRepository(),
    failedJobs: new InMemoryFailedJobRepository(),
    researchJobs: new InMemoryResearchJobRepository(),
  };
}
