# 🔄 Rollback 與中斷回復方案

本文件定義浩呆 LINE Bot 在搬遷、重建或更新過程中出問題時，如何停止、回退、保留現況與重新接續，避免一次失敗就整段卡死。

---

## 1. 高風險操作清單

以下操作具有不可逆或難以回復的風險，執行前必須確認備份與回退計畫已就緒：

| 操作 | 風險等級 | 說明 |
|------|----------|------|
| 更換 LINE Channel Access Token / Secret | 🔴 高 | 換錯會導致所有訊息收發中斷 |
| 更新或刪除 Cloud Run 環境變數 | 🔴 高 | 遺漏或填錯任何一個變數都會讓 Bot 無法運作 |
| 搬移 `tasks.json` 或 `api_usage.json` | 🔴 高 | 遺失資料不可自動恢復，任務與額度記錄會歸零 |
| 重建 Cloud Run 服務（全新部署） | 🔴 高 | 若 URL 改變，LINE Webhook 必須同步更新 |
| 更改 Notion Token 或 Database ID | 🟡 中 | 設定錯誤會停止同步，但不影響主要 Bot 功能 |
| 更改 Make.com Webhook URL 設定 | 🟡 中 | 提醒功能會失效，但任務資料不受影響 |
| 更新 Python 依賴版本（requirements.txt） | 🟡 中 | 版本不相容可能造成應用程式啟動失敗 |
| 變更 `app.py` 核心邏輯（任務讀寫、訊息處理） | 🟡 中 | 錯誤可能導致任務資料讀寫損壞 |
| 更換 GCP 專案或 Cloud Run 服務名稱 | 🟡 中 | URL 改變，所有外部整合需重設 |
| 刪除整個 Cloud Run 服務 | 🔴 高 | 無法即時復原，需重新部署 |

---

## 2. 停止操作的條件

遇到以下任一情況，**立即停止操作，不要繼續往下執行**：

- ❌ 環境變數填入後，`/callback` 端點回應 500 或 403
- ❌ 發訊息給 Bot 後超過 30 秒無回應
- ❌ Cloud Run 部署狀態卡在「進行中」超過 15 分鐘
- ❌ `tasks.json` 讀取後內容為空或格式異常（非 JSON 陣列）
- ❌ LINE Developers Console 的 Webhook Verify 失敗
- ❌ Notion 同步連續失敗 3 次以上（日誌出現 Notion 相關錯誤）
- ❌ `api_usage.json` 計數出現負數或異常大數值

---

## 3. 各操作的回退步驟

### 3.1 Cloud Run 部署失敗（代碼更新後掛掉）

Cloud Run 保留歷史修訂版本（Revisions），可以快速切回上一版：

**步驟：**
```bash
# 列出所有修訂版本
gcloud run revisions list --service haodai-linebot --region asia-east1

# 直接將流量切回上一個正常版本（例如 haodai-linebot-00005-abc）
gcloud run services update-traffic haodai-linebot \
  --region asia-east1 \
  --to-revisions haodai-linebot-00005-abc=100
```

**或透過 Console 操作：**
1. 開啟 Cloud Run → 選擇服務
2. 進入「修訂版本」頁籤
3. 找到上一個正常版本 → 右鍵「管理流量」
4. 將 100% 流量切換到該版本

---

### 3.2 環境變數填錯（Bot 無法啟動）

**步驟：**
1. 開啟 Cloud Run Console → 選擇服務 → 「編輯並部署新修訂版本」
2. 進入「變數與密鑰」
3. 逐一核對並更正環境變數
4. 部署新版本後確認 `/callback` 回傳 200

> ⚠️ 如果不確定原本的值，先到舊的 Revision 查看設定，再對照修正。

---

### 3.3 LINE Token / Secret 換錯（收發訊息中斷）

**步驟：**
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 記下現有的 Channel Access Token（每次 Issue New Token 前先截圖）
3. 若已換新 Token 且 Bot 中斷：
   - 在 LINE Developers 重新 Issue 一組新 Token
   - 更新 Cloud Run 環境變數 `LINE_CHANNEL_ACCESS_TOKEN`
4. 在 LINE Developers 按「Verify」確認 Webhook 連線

---

### 3.4 `tasks.json` 遺失或損壞

**最小回退方式：**
1. 先建立空的 `tasks.json`（應用程式可正常啟動）：
   ```json
   []
   ```
2. 若有備份，從備份還原（見第 4 節備份說明）
3. Bot 可繼續新增任務，歷史任務無法還原（除非有備份）

> ⚠️ Cloud Run 的容器是無狀態的，每次重新部署或重啟都可能讓本地檔案消失。若任務資料重要，**必須遷移至外部儲存（如 Notion、Google Firestore）**。

---

### 3.5 Notion 同步失敗（不影響主功能）

**步驟：**
1. 檢查 Cloud Run 日誌，找到 Notion 相關錯誤訊息
2. 常見原因：
   - `NOTION_TOKEN` 過期 → 重新建立整合 Token 並更新環境變數
   - `NOTION_DATABASE_ID` 填錯 → 前往 Notion 確認資料庫 URL 中的 ID
   - 資料庫未與整合分享 → 在 Notion 重新「連結到整合」
3. Bot 主要功能（LINE 任務管理）不受 Notion 影響，可繼續使用

---

### 3.6 Make.com 提醒停止觸發

**步驟：**
1. 前往 Make.com 確認場景（Scenario）是否仍處於「啟用」狀態
2. 測試手動觸發 `/reminders-check` 端點，確認回應正常
3. 若 URL 已改變，在 Make.com 更新 HTTP 模組的目標 URL
4. 確認 `/reminders-mark-sent` 的 webhook 也同步更新

---

## 4. 備份與保留原狀

### 執行高風險操作前，必須先備份以下內容：

| 內容 | 備份方式 | 存放位置建議 |
|------|----------|--------------|
| `tasks.json` | 手動複製檔案內容 | 本機文字檔、Google Drive、Notion 頁面 |
| `api_usage.json` | 手動複製檔案內容 | 本機文字檔 |
| Cloud Run 環境變數 | 截圖或複製到安全位置 | 個人加密筆記（不要放 Git） |
| LINE Token / Secret | 截圖 LINE Developers Console | 個人加密筆記 |
| Cloud Run 目前 Revision 名稱 | 記下目前版本號 | 操作日誌 |
| LINE Webhook URL | 截圖目前設定 | 操作日誌 |

### 備份 `tasks.json` 的快速指令：
```bash
# 從 Cloud Run 下載（需使用 Cloud Storage 或其他方式）
# 建議：在操作前先透過 Bot 指令 /tasks 取得目前任務清單截圖

# 或透過 Notion 同步確認資料已備份
```

> ⚠️ Cloud Run 為無狀態容器，`tasks.json` 存在於容器內部，容器重啟後資料會消失。長期方案請參考 [遷移至持久儲存](#長期改善方向)。

---

## 5. 中斷後重新接續的步驟

若操作到一半被中斷（例如網路斷線、操作者離開、系統當機），重新接手時：

### 5.1 確認目前狀態

1. **確認 Bot 是否仍在線：**
   - 在 LINE 傳訊息給 Bot，確認有回應
   - 或前往 Cloud Run Console 確認服務狀態為「正在執行」

2. **確認資料完整性：**
   - 傳送「今天待辦」確認任務列表是否正常
   - 傳送「額度」確認 API 使用量是否合理

3. **確認外部整合是否正常：**
   - 手動觸發 `/cron-daily-report` 確認每日報告功能
   - 手動觸發 `/reminders-check` 確認提醒功能

### 5.2 確認中斷點

根據操作日誌，確認：
- 已完成哪些步驟（有沒有新的 Revision 在 Cloud Run 上）
- 尚未完成的步驟是什麼
- 是否有需要還原的操作

### 5.3 從安全點繼續

- 如果中斷點之前的操作**都正常**：從中斷點繼續執行
- 如果中斷點之前**有操作出錯**：先執行對應的回退步驟（見第 3 節），確認恢復正常後再繼續

---

## 6. 操作前的確認檢查點

執行任何高風險操作前，請逐一確認：

```
□ 已備份 tasks.json 和 api_usage.json
□ 已記錄目前的 Cloud Run Revision 版本號
□ 已截圖目前所有環境變數（不含機密值，僅記錄變數名稱和是否有填寫）
□ 已確認 LINE Developers 目前的 Webhook URL
□ 已確認目前 Bot 可以正常收發訊息（操作前最後一次測試）
□ 已確認 Notion 同步在操作前是正常的（若有使用 Notion）
□ 已確認 Make.com 提醒在操作前是正常的（若有使用 Make.com）
□ 清楚知道這次操作的第一個回退步驟是什麼
```

---

## 7. 長期改善方向

> 以下為現有架構的已知限制，若未來要降低失敗風險，可考慮：

- **持久儲存**：將 `tasks.json` 遷移至 Google Firestore 或 Cloud Storage，避免容器重啟造成資料遺失
- **自動備份**：設定每日定時備份 tasks 到 Notion 或 Google Sheets
- **CI/CD**：在 GitHub Actions 加入部署前的環境變數驗證
- **健康檢查**：設定 Cloud Run 的 `/` 端點為健康檢查，部署失敗時自動保留舊版本

---

**最後更新：2026 年 4 月 18 日**
