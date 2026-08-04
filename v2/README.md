# 浩呆 v2 Foundation

TypeScript monorepo for the first-generation personal assistant foundation.

## Quick start

```bash
cd v2
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Layout

```text
v2/
├── apps/
│   ├── assistant-api/          # internal HTTP surface (n8n + worker)
│   └── line-webhook-worker/    # CF Worker-shaped LINE ingress
├── packages/
│   ├── action-contracts/       # Zod action schemas
│   ├── line-events/            # webhook parse + signature interface
│   ├── domain/                 # services, repos, agents boundary
│   └── test-fixtures/
├── n8n/workflows/              # inactive workflow JSON
├── supabase/migrations/        # draft only
├── tests/
└── docs/
```

## Architecture boundaries

- **LINE** is the only user entry.
- **OpenClaw** is the only primary agent (NL → intents).
- **Hermes** is internal research only — never receives LINE events.
- **n8n** runs deterministic background jobs only (inactive by default).
- **Supabase** is the state of record (interfaces + draft SQL; no production apply).

## Safety

- No real secrets in repo.
- No production webhook / Cloudflare / Supabase changes.
- n8n workflows ship with `"active": false`.
