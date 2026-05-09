> 繁體中文版。原始文件：README.md（英文）

# 浩呆 - LINE Bot 機器人 🤖

「浩呆」是一個以台灣同志男生朋友為角色設定的 LINE 機器人，整合 AI 聊天、待辦任務管理與智慧提醒功能。

## 功能特色 ✨

### 💬 陪聊天
- 使用自然、友善的台灣朋友語氣互動
- 能理解使用者的日常故事與情境
- 透過 Perplexity AI 提供 AI 驅動對話

### 📝 待辦任務管理
- 支援新增、查詢、完成與刪除任務
- 可設定優先級（重要 / 普通 / 輕鬆）
- 可指定任務擁有者（世鈞 / 大人 / 共同）
- 可自動建立時間提醒

### ⏰ 智慧提醒
- 單次提醒
- 每日提醒
- N 天後提醒
- 支援 Make.com 自動化整合

### 📊 快速查詢
- 小結：查看今天與明天的任務摘要
- 本週待辦：查看本週全部任務
- 誰還沒做：統計未完成任務
- AI 額度查詢

### 🔗 外部整合
- **Notion**：自動同步任務到 Notion database（資料庫）
- **Make.com**：處理自動提醒與任務流程
- **LINE Webhook**：即時接收與回覆訊息

---

## 🚀 快速開始

### 前置條件
- Python 3.9+
- LINE Official Account（已啟用 Messaging API）
- Perplexity API key（API 金鑰）
- Google Cloud 帳號（部署用）
- GitHub 帳號（版本控制用）

### 1. 本機開發

#### 安裝依賴
```bash
pip install -r requirements.txt
```

#### 設定環境變數
```bash
cp .env.example .env
# 編輯 .env，填入 API 金鑰
```

#### 啟動應用程式
```bash
python app.py
```

應用程式會在 `http://localhost:5000` 提供服務。

### 2. 部署到 Google Cloud Run

#### 方式 1：使用 gcloud CLI（推薦）
```bash
gcloud config set project YOUR-PROJECT-ID
gcloud config set compute/region asia-east1

gcloud run deploy haodai-linebot \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars \
    LINE_CHANNEL_ACCESS_TOKEN=你的token,\
    LINE_CHANNEL_SECRET=你的secret,\
    PERPLEXITY_API_KEY=你的api_key,\
    USER_A_ID=世鈞的LINE_ID,\
    USER_B_ID=大人的LINE_ID,\
    REPORT_USER_ID=報告接收者ID
```

#### 方式 2：使用 Google Cloud Console
1. 開啟 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇你的 project（專案）
3. 進入 Cloud Run
4. 點擊「建立服務」
5. 選擇「從原始碼部署」
6. 連接 GitHub repository（倉庫）
7. 設定環境變數
8. 部署

部署完成後，Webhook URL（回呼網址）通常會是：
```
https://haodai-linebot-xxxxx.run.app/callback
```

#### 方式 3：使用 container image（容器映像）
```bash
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/haodai-linebot

gcloud run deploy haodai-linebot \
  --image gcr.io/YOUR-PROJECT-ID/haodai-linebot \
  --region asia-east1 \
  --allow-unauthenticated
```

---

## 📋 指令清單

### 新增任務
```
待辦 買牛奶
待辦 開會 14:00
待辦 繳費 2025-12-01
待辦 繳費 2025-12-01 10:00
明日待辦 買早餐
明日待辦 買早餐 08:00

待辦 看牙醫 重要 給Edgar
待辦 運動 給潘大人
```

### 查詢任務
```
今天待辦
明日待辦列表
世鈞待辦
潘大人待辦
情侶待辦
小結
本週待辦
誰還沒做
```

### 完成、修改、刪除
```
完成 1
買牛奶完成
刪除 1
刪除 2025-12-01 2
改時間 1 14:00
改時間 2025-12-01 1 09:00
改內容 1 新的任務內容
改內容 2025-12-01 1 新內容
```

### 提醒功能
```
提醒 看牙醫 2025-11-30 15:00
每日提醒 運動 07:00 從 2025-11-25 到 2025-12-02
5天後提醒 買禮物 18:00
查詢提醒 看牙醫
刪除提醒 看牙醫 1
```

### AI 功能
```
整理成待辦：下週要去台中玩兩天，幫我列需要準備的東西
額度
我的ID
```

---

## 🔧 設定說明

### 必要設定
| 環境變數 | 說明 | 來源 |
|---------|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE channel access token（頻道存取權杖） | [LINE Developers](https://developers.line.biz/) |
| `LINE_CHANNEL_SECRET` | LINE channel secret（頻道密鑰） | [LINE Developers](https://developers.line.biz/) |
| `PERPLEXITY_API_KEY` | Perplexity API key（API 金鑰） | [Perplexity](https://www.perplexity.ai/) |

### 選用設定
| 環境變數 | 說明 | 預設值 |
|---------|------|--------|
| `USER_A_ID` | 世鈞的 LINE ID | 未設定 |
| `USER_B_ID` | 大人的 LINE ID | 未設定 |
| `REPORT_USER_ID` | 每日報告接收者 | 未設定 |
| `MONTHLY_API_LIMIT` | 每月 AI 額度上限 | 500 |
| `NOTION_TOKEN` | Notion API token（權杖） | 未設定 |
| `NOTION_DATABASE_ID` | Notion database ID（資料庫 ID） | 未設定 |
| `MAKE_WEBHOOK_URL` | Make.com webhook URL（回呼網址） | 未設定 |

---

## 🔗 API 端點

### Webhook
```http
POST /callback
```
LINE 訊息 webhook（回呼）端點。

### 查詢端點
```http
GET /
```
首頁，顯示機器人狀態與可用 API 端點。

```http
GET /cron-daily-report
```
由外部 cron scheduler（排程器）觸發每日報告。

```http
GET /reminders-check
```
由 Make.com 每分鐘呼叫，用來檢查待發送提醒。

### 更新端點
```http
POST /reminders-mark-sent
```
將提醒標記為已送出。

```json
{
  "task_id": 1,
  "reminder_id": "abc123",
  "reminder_index": 0
}
```

---

## 🔄 LINE 設定
1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Messaging API channel（頻道）
3. 在「基本設定」取得：
   - **Channel Access Token**
   - **Channel Secret**
4. 在「Webhook 設定」中啟用 webhook
5. 將 Webhook URL 設為部署網址加上 `/callback`
6. 完成 Verify（驗證）測試

---

## 📱 取得 LINE ID
在 LINE 私訊機器人：
```
我的ID
```
機器人會回覆可用於 `USER_A_ID` 或 `USER_B_ID` 的 LINE ID。

---

## 🤖 Make.com 自動化（可選）

### 設定每日報告
1. 前往 [Make.com](https://www.make.com/)
2. 建立新 scenario（場景）
3. 使用 HTTP 模組呼叫 `/cron-daily-report`
4. 設定每日固定時間執行

### 設定自動提醒
1. 建立每分鐘執行的 scenario
2. 呼叫 `/reminders-check`
3. 解析待發送提醒
4. 透過 LINE 模組送出訊息
5. 呼叫 `/reminders-mark-sent` 回寫狀態

---

## 📚 Notion 整合（可選）
1. 前往 [Notion Developers](https://developers.notion.com/)
2. 建立新的 integration（整合）
3. 取得 `NOTION_TOKEN`
4. 建立包含名稱、日期、時間、擁有者、優先級、狀態欄位的 database
5. 設定 `NOTION_DATABASE_ID`
6. 將資料庫分享給 integration

---

## 📋 每日進場順序
1. **`小結`**：確認今天與明天的重點
2. **`今天待辦`**：查看完整清單
3. **`誰還沒做`**：找出需追蹤項目
4. 進入當日主要工作區

詳細內容可參考 `DAILY_CHECKLIST.md`。

---

## 📁 文件結構
```
haodai-linebot/
├── app.py
├── main.py
├── requirements.txt
├── .env.example
├── .gitignore
├── app.yaml
├── Procfile
├── cloudrun.yaml
├── README.md
├── DAILY_CHECKLIST.md
├── tasks.json
└── api_usage.json
```

---

## 🚦 啟動前檢查（Preflight）
應用程式在接受 HTTP 流量前會先驗證必要環境變數與狀態檔案是否正常；失敗時會直接停止啟動並在 log（日誌）中顯示錯誤。

### 必要環境變數
| 環境變數 | 缺少時的錯誤訊息 |
|---------|----------------|
| `LINE_CHANNEL_ACCESS_TOKEN` | `Missing required environment variable: LINE_CHANNEL_ACCESS_TOKEN` |
| `LINE_CHANNEL_SECRET` | `Missing required environment variable: LINE_CHANNEL_SECRET` |
| `PERPLEXITY_API_KEY` | `Missing required environment variable: PERPLEXITY_API_KEY` |

### 執行期狀態檔案
| 檔案 | 檢查內容 |
|------|---------|
| `tasks.json` | 驗證 JSON 格式，若不存在則測試是否可建立 |
| `api_usage.json` | 驗證 JSON 格式，若不存在則測試是否可建立 |

### 本機診斷
```bash
LINE_CHANNEL_ACCESS_TOKEN=xxx \
  LINE_CHANNEL_SECRET=yyy \
  PERPLEXITY_API_KEY=zzz \
  python app.py
```

成功啟動後，log 會出現：
```
INFO:app:Preflight checks passed
INFO:app:LINE credentials configured successfully
INFO:app:All handlers registered successfully
```

### Cloud Run 診斷
```bash
gcloud run logs read haodai-linebot --region asia-east1 --limit 50
```
在 log 中搜尋 `PREFLIGHT FAILED` 可快速定位問題。

---

## 🐛 除錯

### 檢查日誌
```bash
gcloud run logs read haodai-linebot --limit 100
```

### 常見問題
- **機器人不回覆**：檢查 LINE token / secret 與 webhook 設定。
- **AI 回應失敗**：檢查 `PERPLEXITY_API_KEY` 與月額度。
- **任務無法保存**：確認應用程式有檔案寫入權限。

---

## 🤝 貢獻
如有建議或發現 Bug（錯誤），歡迎提出 Issue 或 Pull Request。

## 📄 授權
本專案目前為個人使用專案。

## 📁 工作區
正式工作路徑為：`C:\Users\EdgarsTool\Projects\haodai-linebot`

詳見 `WORKSPACE.md`。
