# Compare with v1

## Concepts retained

- LINE as the user-facing channel
- Reminders and tasks as core objects
- Daily report / wrap-up idea
- Need for reliable delivery and retries

## Not carried over as-is

| v1 | v2 foundation |
|---|---|
| Monolithic `app.py` | Modular TypeScript packages |
| `tasks.json` / `api_usage.json` files | Repository interfaces → Supabase |
| Text command UI as primary control | Resource IDs + postback buttons |
| Make.com webhooks | n8n deterministic workflows |
| Direct multi-tool spaghetti | OpenClaw sole primary agent |
| Optional Hermes as peer chatter | Hermes internal research only |

## Why leave tasks.json / api_usage.json

File-based state does not support concurrent webhook redelivery, multi-instance deploy, or audited idempotency. Supabase (Postgres) is the intended state of record.

## Why not text-command primary UI

Ordinal commands ("完成第 1 筆") break when lists reorder. Stable UUIDs + postback `data` are required.

## Why n8n replaces Make.com

- Workflows versioned as JSON in git
- Self-hostable beside internal APIs
- Explicit inactive-by-default policy for safe foundation PRs
