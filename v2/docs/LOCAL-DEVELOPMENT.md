# Local development

## Requirements

- Node.js >= 20
- pnpm 9.x

## Commands

```bash
cd v2
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Environment

Copy `.env.example` — all values are placeholders. Never commit real secrets.

## Testing without LINE / Supabase / n8n

- Domain tests use `createInMemoryUnitOfWork()`.
- LINE signature tests use local HMAC fixtures.
- n8n JSON is validated structurally in tests (active=false, no AI nodes).

## Import n8n workflows

See `n8n/README.md`. Keep workflows inactive.
