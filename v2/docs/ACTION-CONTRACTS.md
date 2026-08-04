# Action Contracts

Implemented in `packages/action-contracts` with Zod.

Each contract includes:

- input schema
- output schema
- typed error codes (`ActionErrorSchema`)
- confirmation policy
- idempotency requirement
- executor designation

## Catalogue

| Name | Idempotent | Executor | Confirmation |
|---|---|---|---|
| `inbox.capture` | yes | domain | none |
| `task.create` | yes | domain | soft |
| `task.list_today` | no | domain | none |
| `task.complete` | yes | domain | button |
| `task.snooze` | yes | domain | button |
| `task.undo_complete` | yes | domain | button |
| `reminder.create` | yes | domain | soft |
| `reminder.cancel` | yes | domain | button |
| `reminder.snooze` | yes | domain | button |
| `reminder.mark_delivered` | yes | n8n | none |
| `summary.daily` | yes | n8n | none |
| `research.delegate` | yes | hermes_internal | explicit |

See source: `packages/action-contracts/src/index.ts`.
