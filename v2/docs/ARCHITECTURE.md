# Architecture

```text
LINE
  → line-webhook-worker (signature + normalize)
    → assistant-api
      → OpenClaw (sole primary agent)
      → domain services
      → repository interfaces (in-memory | Supabase later)

n8n (inactive)
  → assistant-api internal endpoints only
  → reminder dispatch / daily wrap-up / failed retry

Hermes
  ← research.delegate only (from OpenClaw/internal)
  ✗ never LINE ingress
```

## Packages

| Package | Responsibility |
|---|---|
| `action-contracts` | Zod input/output + meta (idempotency, executor) |
| `line-events` | Parse, signature interface, reply/push model |
| `domain` | Inbox/Task/Reminder/Summary/Research + repos |
| `test-fixtures` | Webhook + n8n payload fixtures |

## Idempotency

1. `event_receipts.line_event_id` — webhook redelivery
2. `action_receipts.idempotency_key` — action replay
3. reminder `delivery_key` — push replay
4. daily summary `(user_id, date)` — once per day

## Executor map

| Action | Executor |
|---|---|
| inbox/task/reminder mutations | domain |
| summary.daily / mark_delivered | n8n → domain API |
| research.delegate | hermes_internal |
| NL interpretation | openclaw |
