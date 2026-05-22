# GitHub Copilot Instructions — haodai-linebot

## Project Overview
LINE Bot for AI chat, todo management, and smart reminders.
Stack: Python 3.9+ · Flask · LINE Messaging API · Perplexity AI · Notion API · Make.com · Google Cloud Run

## Git Workflow
- Always `git pull origin main` before starting any work.
- Use conventional commits: `feat(scope): description` / `fix(scope): description` / `chore(scope): description`
- Reference issues in commits: `fix(#42): resolve reminder not firing`
- Scope examples: `bot`, `tasks`, `reminders`, `notion`, `deploy`, `api`

  ## Environment & Secrets
  - NEVER hardcode API keys. All secrets go in `.env` (local) or Cloud Run environment variables (production).
  - Required env vars: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`, `PERPLEXITY_API_KEY`
  - Optional: `USER_A_ID`, `USER_B_ID`, `REPORT_USER_ID`, `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `MAKE_WEBHOOK_URL`, `MONTHLY_API_LIMIT`
  - `.env` is gitignored — always update `.env.example` when adding new vars.

  ## Architecture
  - Entry point: `app.py` (Flask webhook handler)
  - Webhook endpoint: `POST /callback` — all LINE messages come through here
- Cron endpoints: `GET /cron-daily-report`, `GET /reminders-check`
  - Task data: `tasks.json` (runtime generated, NOT committed)
  - API usage tracking: `api_usage.json` (runtime generated, NOT committed)

  ## Code Style
  - Python: follow PEP 8, use f-strings, type hints where practical
- Keep webhook handler thin — delegate logic to helper functions
- Handle LINE API errors gracefully; always return HTTP 200 to LINE even on internal errors (otherwise LINE retries)
- Log errors clearly for Cloud Run log inspection (`gcloud run logs read haodai-linebot`)

## Deployment
- Deploy to Google Cloud Run region `asia-east1`
- Use `gcloud run deploy haodai-linebot --source . --region asia-east1 --allow-unauthenticated`
  - After deploy, verify webhook URL is set correctly in LINE Developers Console

## Testing
- Test locally with `python app.py` on `http://localhost:5000`
- Use ngrok or similar to expose local server for LINE webhook testing
- Check AI quota with the bot command: `額度`

## Common Issues to Watch
- LINE always expects HTTP 200 — never let exceptions bubble up to the response
- `tasks.json` file write permissions must exist in the runtime environment
- Make.com calls `/reminders-check` every minute — keep this endpoint fast
- Perplexity API monthly limit tracked in `api_usage.json`
