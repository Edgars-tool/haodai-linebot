# n8n workflows (Foundation)

All workflows are **inactive by default**, contain **no production credentials**, and do **not** use n8n AI Agent nodes.

## Files

| File | Active | Schedule |
|---|---|---|
| `workflows/haodai.reminder.dispatch.json` | `false` | every 1 min |
| `workflows/haodai.daily.wrapup.json` | `false` | every 15 min |
| `workflows/haodai.failed-job.retry.json` | `false` | every 5 min |

## Environment variables

| Name | Example | Used by |
|---|---|---|
| `ASSISTANT_API_BASE_URL` | `http://*********:8787` | all |
| `N8N_CALLBACK_TOKEN` | `replace_with_local_n8n_token` | all (header `x-internal-token`) |

Do not put LINE tokens or Supabase service-role keys into n8n credentials for foundation.

## Import

1. Open n8n UI → Workflows → Import from File.
2. Select a JSON under `workflows/`.
3. Confirm **Active** remains off.
4. Wire placeholder credential references only in local/dev.

## Internal API contracts

### reminder.dispatch

- `GET /v1/internal/reminders/due` → `{ reminders: [{ reminder_id, user_id, title, remind_at, delivery_key }] }`
- `POST /v1/internal/line/push` → simulated or real push via assistant-api
- `POST /v1/internal/reminders/delivered` → idempotent mark

### daily.wrapup

- `GET /v1/internal/users/summary-due?timezone=Asia/Taipei` → `{ users: [...] }` (stub endpoint for later wiring)
- `POST /v1/internal/summary/daily` → summary payload + `should_push`
- `POST /v1/internal/line/push`

### failed-job.retry

- `GET /v1/internal/jobs/retryable`
- `POST /v1/internal/jobs/retry`
- `POST /v1/internal/jobs/dead`
