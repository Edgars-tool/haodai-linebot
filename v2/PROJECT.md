# 浩呆 v2｜第一代個人助理

狀態：Foundation / 尚未部署  
日期：2026-07-12  
施工分支：`v2/foundation`

## 一句話定位

存在於 LINE 裡的個人生活收件員。使用者只管把事情丟進來，浩呆負責接住、整理、提醒與找回。

## 第一代目標

第一代只服務 Edgar 本人，先做出一條真實可用、可錄影、可每天使用的完整流程：

```text
LINE 自然語言
→ 建立任務或提醒
→ 儲存狀態
→ 到點主動提醒
→ 使用按鈕完成或延後
→ 晚間收到每日收尾
```

第一代不是完整 SaaS，也不是多租戶客服系統。

## 使用者不需要學的東西

Edgar 不需要先學 n8n、MCP、Webhook、Supabase SQL 或 Agent routing。

這些都是後台零件，不是產品介面。

## n8n 的正確角色

n8n 不是浩呆的大腦，也不是主要對話 Agent。

它是可視化工作流執行器，負責重複、定時、確定性的工作：

- 到點檢查提醒
- 傳送提醒
- 晚間產生每日收尾
- 失敗重試
- 後續 SaaS 同步

第一代不要使用 n8n 的多 Agent 功能作為核心，避免 OpenClaw、Hermes 與 n8n 同時搶主導權。

## 角色分工

| 元件 | 第一代角色 |
|---|---|
| LINE | 唯一使用者入口 |
| Cloudflare Worker | 驗證 LINE webhook、快速接收事件 |
| Cloudflare Queue | 緩衝與可靠投遞 |
| OpenClaw | 唯一主代理、理解自然語言、組織回覆 |
| edgars-mcp | 工具契約、權限與 schema 邊界 |
| Supabase | 任務、提醒、事件與狀態資料庫 |
| n8n | 排程、提醒、每日收尾、重試 |
| Hermes | 深入研究 worker，第一代先保留接口，不主導日常對話 |
| 1Password | secrets 來源，第一代不把秘密放進 repo |

## 第一代功能範圍

### 必做

1. **記一件事**
   - 接收自然語言。
   - 日期不完整也先保存。
   - 可成為 inbox item、task 或 reminder draft。

2. **今天要做什麼**
   - 顯示今日未完成任務。
   - 每張卡可完成、延後或查看更多。

3. **設定提醒**
   - 支援自然語言日期時間。
   - 資訊不足時只補問必要欄位。
   - 建立後提供取消按鈕。

4. **完成與延後**
   - 使用穩定 resource ID。
   - 不使用「完成第 1 筆」文字指令。
   - 完成後提供短時間 Undo。

5. **每日收尾**
   - 完成事項。
   - 未完成事項。
   - 明日提醒。
   - 可按「明天再說」。

6. **事件去重**
   - LINE webhook 重送不得建立重複資料。
   - 每個 action 必須具備 idempotency key。

7. **深入研究入口**
   - 第一代可先顯示按鈕與 job 狀態。
   - 真正 Hermes delegation 可在主流程穩定後接入。

### 暫不做

- 多商家客服
- 付款與訂閱
- 完整 Integration Hub
- Notion 同步
- Gmail / Calendar OAuth
- 大型管理後台
- 多 Agent 自由協商
- 自動替使用者執行高影響操作
- LIFF 複雜編輯器

## 第一代 LINE 選單

2 × 3 Rich Menu：

| 第一排 | 第一排 | 第一排 |
|---|---|---|
| 記一件事 | 今天 | 提醒 |

| 第二排 | 第二排 | 第二排 |
|---|---|---|
| 幫我整理 | 深入研究 | 更多 |

第一代優先實作前三個與每日收尾。後三個可先有明確的「尚未接線」或最小功能，不做假按鈕。

## 第一條展示流程

使用者傳：

> 明天下午 8 點提醒我繳電費

系統：

1. OpenClaw 擷取任務、日期與時間。
2. edgars-mcp 驗證 `reminder.create` contract。
3. Supabase 寫入 reminder。
4. LINE 回覆確認卡：
   - 明天 20:00
   - 繳電費
   - `[改時間] [取消提醒]`
5. n8n 到點讀取待送提醒。
6. n8n 透過內部送信端點要求 LINE push。
7. 使用者收到：
   - `[完成] [晚一天] [稍後提醒]`
8. 晚上 n8n 產生每日收尾。

## 最小 Action Contracts

### `inbox.capture`

```json
{
  "source_event_id": "string",
  "user_id": "string",
  "content_type": "text|image|audio|url|forwarded",
  "content": "string",
  "received_at": "ISO-8601"
}
```

### `task.create`

```json
{
  "user_id": "string",
  "title": "string",
  "due_at": "ISO-8601|null",
  "source_event_id": "string",
  "idempotency_key": "string"
}
```

### `task.complete`

```json
{
  "user_id": "string",
  "task_id": "uuid",
  "idempotency_key": "string"
}
```

### `reminder.create`

```json
{
  "user_id": "string",
  "title": "string",
  "remind_at": "ISO-8601",
  "timezone": "Asia/Taipei",
  "source_event_id": "string",
  "idempotency_key": "string"
}
```

### `reminder.snooze`

```json
{
  "user_id": "string",
  "reminder_id": "uuid",
  "snooze_until": "ISO-8601",
  "idempotency_key": "string"
}
```

## 最小資料表

### `users`

- `id`
- `line_user_id`
- `display_name`
- `timezone`
- `daily_summary_time`
- `created_at`

### `event_receipts`

- `line_event_id`
- `received_at`
- `processed_at`
- `status`
- `payload_hash`

### `inbox_items`

- `id`
- `user_id`
- `source_event_id`
- `content_type`
- `raw_content`
- `classified_as`
- `status`
- `created_at`

### `tasks`

- `id`
- `user_id`
- `title`
- `due_at`
- `status`
- `source_event_id`
- `created_at`
- `completed_at`

### `reminders`

- `id`
- `user_id`
- `task_id`
- `title`
- `remind_at`
- `status`
- `last_delivery_at`
- `created_at`

### `action_receipts`

- `idempotency_key`
- `action_name`
- `resource_id`
- `result`
- `created_at`

## 第一代 n8n 工作流

只建立三條：

1. `haodai.reminder.dispatch`
2. `haodai.daily.wrapup`
3. `haodai.failed-job.retry`

詳細規格見 `v2/N8N-FIRST-WORKFLOWS.md`。

## 完成標準

第一代 Foundation 完成時必須具備：

- 所有服務可在不使用真實 secrets 的測試環境啟動。
- LINE event parser 有 fixture 測試。
- 同一 webhook event 重送兩次只建立一筆資料。
- 建立提醒、取消提醒、完成、延後有測試。
- n8n workflow 可匯入，但預設 inactive。
- Hermes 不直接接 LINE。
- OpenClaw 是唯一主代理。
- 提供回滾與比較報告。

## 官方研究基準

查詢日期：2026-07-12

- LINE webhook：<https://developers.line.biz/en/docs/messaging-api/receiving-messages/>
- LINE Quick Reply：<https://developers.line.biz/en/docs/messaging-api/using-quick-reply/>
- n8n database configuration：<https://docs.n8n.io/hosting/configuration/environment-variables/database/>
- Supabase Postgres connection：<https://supabase.com/docs/guides/database/connecting-to-postgres>

## 停止條件

以下情況不得自行推進：

- 需要真實 LINE token、Supabase password 或 1Password service account token。
- 需要修改 production webhook。
- 需要建立公開 Cloudflare ingress。
- 需要刪除或改寫舊版浩呆 production。
- 需要讓 OpenClaw 與 Hermes 同時回覆 LINE。
