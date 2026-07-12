# 浩呆 v2｜Foundation Coding Handoff

將以下內容完整交給 coding agent。

---

你正在為 Edgar 建立「浩呆 v2 第一代個人助理」的 Foundation。

Repository：`edgarstool/haodai-linebot`  
Base branch：`v2/foundation`  
工作方式：建立新的 implementation branch，不直接修改 `main`，不碰 production。

建議 branch：

```text
feat/haodai-v2-foundation
```

## 先讀

- `v2/PROJECT.md`
- `v2/N8N-FIRST-WORKFLOWS.md`
- 舊版 `README.md`
- 舊版 `app.py`，只做功能盤點，不沿用單檔巨型架構

## 目標

建立一套可在本機或 CI 驗證的浩呆 v2 Foundation，讓後續能接 LINE、Cloudflare Worker、Supabase、OpenClaw、edgars-mcp 與 n8n。

這次不要連 production，不需要真實 secrets，也不要啟動 ECS 部署。

## 技術方向

優先採用清楚、可測試、可替換的 TypeScript monorepo。

建議結構：

```text
v2/
├── apps/
│   ├── line-webhook-worker/
│   └── assistant-api/
├── packages/
│   ├── action-contracts/
│   ├── line-events/
│   ├── domain/
│   └── test-fixtures/
├── supabase/
│   └── migrations/
├── n8n/
│   └── workflows/
├── tests/
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

可以合理調整，但必須保持：

- LINE adapter 與 domain logic 分離。
- action contracts 可獨立測試。
- persistence 使用 interface，測試時可使用 in-memory adapter。
- OpenClaw、Hermes 與 n8n adapter 不得寫死在 domain core。

## 實作範圍

### 1. Action Contracts

建立並驗證：

- `inbox.capture`
- `task.create`
- `task.list_today`
- `task.complete`
- `task.snooze`
- `reminder.create`
- `reminder.cancel`
- `reminder.snooze`
- `summary.daily`
- `research.delegate`，只做 interface/stub

每個 contract 要有：

- input schema
- output schema
- typed error schema
- confirmation policy
- idempotency requirement
- executor designation

可使用 Zod 或等效穩定 schema library。

### 2. LINE Event Parser

支援 fixture：

- text message
- postback
- webhook redelivery
- follow event
- invalid signature

不要實作真實 token。

需提供：

- signature verification interface
- event normalization
- source event ID extraction
- idempotency key generation
- reply-token expiry aware response model

### 3. Domain Services

建立：

- InboxService
- TaskService
- ReminderService
- DailySummaryService
- EventReceiptService

至少支援：

- 先保存未分類內容
- 建立 task
- 建立 reminder
- 完成 task
- 延後 task/reminder
- 取消 reminder
- 產生確定性 daily summary

### 4. Persistence Contracts

建立 repository interfaces：

- UserRepository
- EventReceiptRepository
- InboxItemRepository
- TaskRepository
- ReminderRepository
- ActionReceiptRepository

提供 in-memory implementation 供測試。

Supabase migration 只建立草案檔案，不執行。

### 5. Idempotency

必須驗證：

- 同一 LINE webhook event 重送兩次，只建立一份 inbox item/task/reminder。
- 同一 postback 點擊兩次，不會完成或延後兩次。
- 同一 reminder delivery job 重跑，不會送出兩次。

### 6. 第一條 Demo Flow

建立自動化測試展示：

```text
輸入：明天下午 8 點提醒我繳電費
→ 產生 reminder draft
→ 確認 action
→ 寫入 reminder
→ 模擬到期
→ 產生 LINE reminder response model
→ 按 snooze one day
→ reminder 更新
→ daily summary 顯示未完成事項
```

日期解析可先使用 deterministic fixture，不必在此階段引入真實 LLM。

### 7. n8n Workflow Skeleton

產出三個可匯入但預設 inactive 的 workflow JSON：

- `haodai.reminder.dispatch.json`
- `haodai.daily.wrapup.json`
- `haodai.failed-job.retry.json`

要求：

- 不含 credentials。
- 使用 placeholder internal URLs。
- 有 Sticky Notes 說明每個節點。
- 不使用 AI Agent node。
- 不直接連 production Supabase。

若無法可靠產生合法 n8n JSON，請先產出 workflow spec 與 validation report，不要偽造可匯入結果。

### 8. 文件

建立：

- `v2/README.md`
- `v2/docs/ARCHITECTURE.md`
- `v2/docs/ACTION-CONTRACTS.md`
- `v2/docs/LOCAL-DEVELOPMENT.md`
- `v2/docs/COMPARE-WITH-V1.md`
- `v2/reports/FOUNDATION-RESULT.md`

`COMPARE-WITH-V1.md` 需說明：

- 哪些舊功能概念保留
- 哪些舊程式碼不沿用
- 為何不再使用 tasks.json / api_usage.json
- 為何不再以文字指令作為主要 UI
- 為何 Make.com 改由 n8n 取代

## 不得做

- 不修改 `main`。
- 不刪除舊版程式碼。
- 不部署 Cloudflare。
- 不修改 LINE webhook。
- 不建立 Supabase production table。
- 不啟動 n8n production。
- 不連接真實 OpenClaw/Hermes。
- 不讀取或建立真實 secrets。
- 不把 LINE token、Supabase key 或 1Password token 放進檔案。
- 不將 Hermes 設為第二個 LINE 回覆者。
- 不把 n8n AI Agent 當主控。

## 驗收命令

請建立可直接執行的專案命令，至少包含：

```text
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

所有命令需在乾淨 checkout 通過。

## 必要測試

- contract validation
- invalid payload rejection
- event normalization
- webhook redelivery deduplication
- postback idempotency
- task create/complete/snooze
- reminder create/cancel/snooze
- daily summary
- first demo flow end-to-end at domain level

## 回滾

所有變更只存在 implementation branch。

回滾方式：刪除 implementation branch，不影響 `main` 與 `v2/foundation`。

## 完成報告

最後輸出：

1. branch 名稱
2. commit SHA
3. 建立與修改檔案清單
4. 實作完成項目
5. 尚未接線項目
6. typecheck/lint/test/build 結果
7. n8n workflow 是否真能匯入
8. 與 v1 比較摘要
9. 下一個最小施工任務
10. rollback 指令

不要自動 merge，不要修改 production。