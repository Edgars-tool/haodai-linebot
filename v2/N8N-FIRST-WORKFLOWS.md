# 浩呆 v2｜第一代 n8n 工作流

狀態：Design only / 預設 inactive  
日期：2026-07-12

## 給第一次使用 n8n 的 Edgar

你不需要先學會 n8n 才能使用浩呆。

把 n8n 想成後台輸送帶：

```text
某件事發生
→ 經過幾個固定步驟
→ 得到確定結果
```

它適合排程、等待、條件判斷、重試與跨服務傳遞。它不應在第一代取代 OpenClaw 的主代理角色。

## Workflow 1：`haodai.reminder.dispatch`

### 目的

每分鐘找出已到時間、尚未送出的提醒，送到 LINE，並保存結果。

### 節點草圖

```text
Schedule Trigger: every minute
→ HTTP Request: internal reminder due endpoint
→ If: no reminders?
   ├─ yes → stop
   └─ no
      → Loop Over Items
      → HTTP Request: internal LINE push endpoint
      → If: delivery success?
         ├─ yes → mark delivered
         └─ no  → mark failed + retry_at
```

### 規則

- 不直接在 workflow 內保存 LINE secret。
- 不直接使用 Supabase service-role key，除非透過 1Password 注入且權限已審查。
- 優先呼叫內部 API，由 API 負責資料庫與 LINE 邏輯。
- 同一 reminder 使用 delivery idempotency key，避免重複推送。
- 第一代每分鐘最多處理 20 筆。

### 驗收

- 未到時間的提醒不送。
- 已送出的提醒不重送。
- 同一 workflow 重跑不產生重複訊息。
- 失敗會留下 status、error 與 retry_at。

## Workflow 2：`haodai.daily.wrapup`

### 目的

在使用者設定的時間產生每日收尾。

### 節點草圖

```text
Schedule Trigger: every 15 minutes
→ HTTP Request: users whose summary window is due
→ Loop Over Items
→ HTTP Request: internal daily summary builder
→ HTTP Request: internal LINE push endpoint
→ mark summary delivered
```

### 第一代摘要格式

```text
今天完成 3 件。
還有 1 件留著：繳電費。
明天有 2 個提醒。

[看未完成] [明天再說]
```

### 規則

- 每個使用者每天最多送一次。
- 沒有任何事項時，不強制推送，可由偏好決定。
- 不使用責備語氣。
- 摘要內容由確定性資料組裝，第一代不必每次呼叫 LLM。

### 驗收

- timezone 使用 `Asia/Taipei`。
- 重跑不會同日送兩次。
- 沒有資料時仍能正常結束。
- LINE push 失敗會進 retry workflow。

## Workflow 3：`haodai.failed-job.retry`

### 目的

重試提醒與摘要的暫時性失敗。

### 節點草圖

```text
Schedule Trigger: every 5 minutes
→ HTTP Request: retryable failed jobs
→ If: retry_count >= max?
   ├─ yes → mark dead + notify admin
   └─ no
      → retry original internal action
      → update result
```

### 第一代重試政策

- 第 1 次：5 分鐘後
- 第 2 次：15 分鐘後
- 第 3 次：60 分鐘後
- 超過 3 次：標記 `dead`
- 不對使用者連續洗版

### 可重試

- LINE 暫時性 5xx
- network timeout
- ECS internal service 暫時不可用
- Supabase 暫時連線失敗

### 不自動重試

- 無效 recipient
- 權限被撤銷
- payload schema 錯誤
- secret 缺失

## n8n 不負責的事情

- 不直接決定使用者意圖。
- 不成為 LINE 對話人格。
- 不自由選擇 Hermes 或 OpenClaw。
- 不直接改付款、訂閱或高影響資料。
- 不保存產品唯一真相，狀態真相在 Supabase。
- 不把 credentials 匯出進 repo。

## 版本控制

Workflow 必須匯出為 JSON 並放在：

```text
v2/n8n/workflows/
├── haodai.reminder.dispatch.json
├── haodai.daily.wrapup.json
└── haodai.failed-job.retry.json
```

所有匯出的 workflow：

- 預設 inactive。
- 不含真實 credentials。
- 使用 placeholder credential references。
- 在 PR 中可比較。

## 第一代學習界面

Edgar 真正需要認得的只有四個畫面概念：

1. **Trigger**：什麼時候開始。
2. **Node**：一步工作。
3. **Execution**：這次有沒有成功。
4. **Active / Inactive**：是否真的會自動執行。

第一代不用先研究 AI Agent Node、向量資料庫或多 Agent orchestration。n8n 在這裡是輸送帶，不是議會。