import { createHash, randomUUID } from "node:crypto";

export const UNDO_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_TIMEZONE = "Asia/Taipei";
export const MAX_REMINDER_DISPATCH = 20;

/** Retry delays: 5m, 15m, 60m */
export const RETRY_DELAYS_MS = [5 * 60_000, 15 * 60_000, 60 * 60_000] as const;
export const MAX_RETRIES = 3;

export function newId(): string {
  return randomUUID();
}

export function nowIso(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString();
}

export function hashPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Format a Date as YYYY-MM-DD in the given IANA timezone.
 */
export function formatDateInTimeZone(
  date: Date,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
}

/**
 * Approximate local day bounds in UTC ISO for a YYYY-MM-DD in Asia/Taipei (UTC+8).
 * Foundation uses fixed +08:00 for Taipei; production may refine with a TZ library.
 */
export function dayBoundsIso(
  dateYmd: string,
  timeZone: string = DEFAULT_TIMEZONE,
): { dayStartIso: string; dayEndIso: string; nextDayStartIso: string } {
  // Only Asia/Taipei is first-class in foundation; other zones fall back to +00:00.
  const offset =
    timeZone === "Asia/Taipei" || timeZone === "Asia/Shanghai"
      ? "+08:00"
      : "+00:00";
  const dayStartIso = `${dateYmd}T00:00:00.000${offset}`;
  const startMs = Date.parse(dayStartIso);
  const endMs = startMs + 24 * 60 * 60 * 1000 - 1;
  const nextStartMs = startMs + 24 * 60 * 60 * 1000;
  return {
    dayStartIso: new Date(startMs).toISOString(),
    dayEndIso: new Date(endMs).toISOString(),
    nextDayStartIso: new Date(nextStartMs).toISOString(),
  };
}

export function addDaysIso(iso: string, days: number): string {
  const ms = Date.parse(iso) + days * 24 * 60 * 60 * 1000;
  return new Date(ms).toISOString();
}

export function nextRetryAt(retryCount: number, nowMs: number = Date.now()): string {
  const idx = Math.min(retryCount, RETRY_DELAYS_MS.length - 1);
  const delay = RETRY_DELAYS_MS[idx] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
  return new Date(nowMs + delay).toISOString();
}

/**
 * Deterministic fixture parser for the first demo flow.
 * Production will replace this with OpenClaw NL understanding.
 */
export function parseReminderDraftFromText(
  text: string,
  nowMs: number = Date.now(),
  timeZone: string = DEFAULT_TIMEZONE,
): { title: string; remindAt: string } | null {
  // Match: 明天下午 8 點提醒我繳電費 / 明天晚上8點...
  const m = text.match(
    /明天\s*(上午|下午|晚上)?\s*(\d{1,2})\s*點(?:\s*(\d{1,2})\s*分)?\s*提醒我(.+)/,
  );
  if (!m) return null;
  const period = m[1];
  let hour = Number(m[2]);
  const minute = m[3] ? Number(m[3]) : 0;
  const title = m[4]!.trim();
  if (period === "下午" || period === "晚上") {
    if (hour < 12) hour += 12;
  }
  if (period === "上午" && hour === 12) hour = 0;

  const todayYmd = formatDateInTimeZone(new Date(nowMs), timeZone);
  const { nextDayStartIso } = dayBoundsIso(todayYmd, timeZone);
  // nextDayStart is tomorrow 00:00 UTC-normalized; rebuild local wall clock.
  const offset =
    timeZone === "Asia/Taipei" || timeZone === "Asia/Shanghai"
      ? "+08:00"
      : "+00:00";
  const tomorrowYmd = formatDateInTimeZone(
    new Date(Date.parse(nextDayStartIso) + 12 * 60 * 60 * 1000),
    timeZone,
  );
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const remindAtLocal = `${tomorrowYmd}T${hh}:${mm}:00.000${offset}`;
  return {
    title,
    remindAt: new Date(Date.parse(remindAtLocal)).toISOString(),
  };
}
