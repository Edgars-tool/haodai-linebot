# 浩呆 - LINE Bot 機器人 🤖

「浩呆」是一個台灣同志男生朋友角色的 LINE 機器人，結合了 AI 聊天、待辦任務管理和智能提醒功能。

## 功能特色 ✨

### 💬 陪聊天
- 自然、友善的台灣朋友語氣
- 了解用戶的故事和日常
- 使用 Perplexity AI 提供 AI 驅動的對話

### 📝 待辦任務管理
- 新增、查詢、完成、刪除任務
- 支援優先級设定（重要/普通/輕鬆）
- 支援任務擁有者設定（世鈞/大人/共同）
- 自動時間提醒設置

### ⏰ 智能提醒
- 單次提醒
- 每日提醒
- N天後提醒
- 支援 Make.com 自動化集成

### 📊 快速查詢
- 小結：今天和明天的任務摘要
- 本週待辦：查看本週所有任務
- 誰還沒做：統計未完成任務
- AI 額度查詢

### 🔗 外部集成
- **Notion**：自動同步任務到 Notion 資料庫
- **Make.com**：自動化提醒和任務管理
- **LINE Webhook**：實時接收和回覆訊息

---

## 🚀 快速開始

### 前置條件
- Python 3.9+
- LINE Official Account（已啟用 Messaging API）
- Perplexity API 金鑰
- Google Cloud 帳戶（用於部署）
- GitHub 帳戶（用於版本控制）

### 1. 本地開發

#### 安裝依賴
```bash
pip install -r requirements.txt
```

#### 配置環境變數
```bash
cp .env.example .env
# 編輯 .env，填入你的 API 金鑰
```

#### 運行應用程式
```bash
python app.py
```

應用程式將在 `http://localhost:5000` 上運行。

### 2. 部署到 Google Cloud Run

#### 方式 1：使用 gcloud CLI（推薦）

```bash
# 設置 GCP 專案
gcloud config set project YOUR-PROJECT-ID

# 設置區域（推薦：asia-east1）
gcloud config set compute/region asia-east1

# 部署到 Cloud Run
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
2. 選擇你的專案
3. 進入 Cloud Run
4. 點擊「建立服務」
5. 選擇「從原始碼部署」
6. 連結你的 GitHub 倉庫
7. 設置環境變數
8. 部署

部署完成後，你會得到一個 webhook URL，例如：
```
https://haodai-linebot-xxxxx.run.app/callback
```

#### 方式 3：使用容器映像

```bash
# 建立 Docker 映像
gcloud builds submit --tag gcr.io/YOUR-PROJECT-ID/haodai-linebot

# 部署到 Cloud Run
gcloud run deploy haodai-linebot \
  --image gcr.io/YOUR-PROJECT-ID/haodai-linebot \
  --region asia-east1 \
  --allow-unauthenticated
```

---

## 📋 指令清單

### 新增任務
```
待辦 買牛奶                    # 新增今天的待辦
待辦 開會 14:00               # 新增今天的待辦（含時間）
待辦 繳費 2025-12-01          # 新增指定日期的待辦
待辦 繳費 2025-12-01 10:00    # 新增指定日期時間的待辦
明日待辦 買早餐                # 新增明天的待辦
明日待辦 買早餐 08:00         # 新增明天的待辦（含時間）

# 指定擁有者和優先級
待辦 看牙醫 重要 給Edgar       # 優先級：重要/普通/隨意
待辦 運動 給潘大人             # 擁有者：給Edgar/給潘大人/兩個人
```

### 查詢任務
```
今天待辦                      # 列出今天所有任務
明日待辦列表                  # 列出明天所有任務
世鈞待辦                      # 列出今天世鈞的任務
潘大人待辦                    # 列出今天大人的待辦
情侶待辦                      # 列出今天共同的待辦
小結                          # 今天和明天的摘要
本週待辦                      # 本週所有任務
誰還沒做                      # 統計未完成任務數量
```

### 完成、修改、刪除
```
完成 1                        # 完成今天第1筆任務
買牛奶完成                    # 用任務名稱完成任務
刪除 1                        # 刪除今天第1筆任務
刪除 2025-12-01 2            # 刪除指定日期第2筆
改時間 1 14:00               # 改今天第1筆的時間
改時間 2025-12-01 1 09:00    # 改指定日期的時間
改內容 1 新的任務內容        # 改今天第1筆的內容
改內容 2025-12-01 1 新內容   # 改指定日期的內容
```

### 提醒功能
```
提醒 看牙醫 2025-11-30 15:00                              # 單次提醒
每日提醒 運動 07:00 從 2025-11-25 到 2025-12-02         # 每日提醒
5天後提醒 買禮物 18:00                                   # N天後提醒
查詢提醒 看牙醫                                          # 查詢任務的提醒
刪除提醒 看牙醫 1                                        # 刪除特定提醒
```

### AI 功能
```
整理成待辦：下週要去台中玩兩天，幫我列需要準備的東西  # AI 自動拆解成多筆待辦
額度                                                    # 查詢本月 AI 額度
我的ID                                                  # 查詢自己的 LINE ID
```

---

## 🔧 配置說明

### 必要配置
| 環境變數 | 說明 | 來源 |
|---------|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE 頻道存取權杖 | [LINE Developers](https://developers.line.biz/) |
| `LINE_CHANNEL_SECRET` | LINE 頻道密鑰 | [LINE Developers](https://developers.line.biz/) |
| `PERPLEXITY_API_KEY` | Perplexity AI API 金鑰 | [Perplexity](https://www.perplexity.ai/) |

### 可選配置
| 環境變數 | 說明 | 預設值 |
|---------|------|--------|
| `USER_A_ID` | 世鈞的 LINE ID（個人提醒） | 未設置 |
| `USER_B_ID` | 大人的 LINE ID（個人提醒） | 未設置 |
| `REPORT_USER_ID` | 每日報告接收者 | 未設置 |
| `MONTHLY_API_LIMIT` | 月度 AI 額度限制 | 500 |
| `NOTION_TOKEN` | Notion API 權杖 | 未設置 |
| `NOTION_DATABASE_ID` | Notion 資料庫 ID | 未設置 |
| `MAKE_WEBHOOK_URL` | Make.com webhook URL | 未設置 |

---

## 🔗 API 端點

### Webhook
```
POST /callback
```
LINE 訊息 webhook 端點

### 查詢
```
GET /
```
主首頁，顯示機器人狀態和 API 端點

```
GET /cron-daily-report
```
發送每日報告（由外部 cron 排程器呼叫）

```
GET /reminders-check
```
檢查待發送提醒（由 Make.com 每分鐘呼叫）

### 更新
```
POST /reminders-mark-sent
```
標記提醒為已發送
```json
{
  "task_id": 1,
  "reminder_id": "abc123",
  "reminder_index": 0
}
```

---

## 🔄 LINE 設置

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 建立新的 Messaging API 頻道
3. 在「基本設置」中取得：
   - **Channel Access Token**（存入 `LINE_CHANNEL_ACCESS_TOKEN`）
   - **Channel Secret**（存入 `LINE_CHANNEL_SECRET`）
4. 在「Webhook 設定」中：
   - 啟用「使用 Webhook」
   - 設置 Webhook URL 為你的部署 URL + `/callback`
     例如：`https://haodai-linebot-xxxxx.run.app/callback`
5. 測試連接

---

## 📱 取得 LINE ID

在 LINE 上私訊機器人：
```
我的ID
```

機器人會回覆你的 Line ID，用於設置 `USER_A_ID` 或 `USER_B_ID`。

---

## 🤖 Make.com 自動化（可選）

### 設置每日報告
1. 前往 [Make.com](https://www.make.com/)
2. 建立新場景（Scenario）
3. 使用 HTTP 模組 GET 你的部署 URL `/cron-daily-report`
4. 設置每天特定時間執行

### 設置自動提醒
1. 建立新場景
2. 設置 HTTP 模組每 1 分鐘 GET `/reminders-check`
3. 解析回傳的待發送提醒
4. 使用 LINE Send Message 模組發送提醒
5. 呼叫 `/reminders-mark-sent` 標記為已發送

---

## 📚 Notion 集成（可選）

1. 前往 [Notion Developers](https://developers.notion.com/)
2. 建立新的整合（Integration）
3. 取得 API Token（存入 `NOTION_TOKEN`）
4. 在 Notion 中建立資料庫，包含以下欄位：
   - 名稱（Title）
   - 日期（Date）
   - 時間（Text）
   - 擁有者（Text）
   - 優先級（Text）
   - 選取 / 狀態（Select）
5. 將資料庫 ID 存入 `NOTION_DATABASE_ID`
6. 與整合分享資料庫

---

## 📁 文件結構

```
haodai-linebot/
├── app.py                 # 主程式
├── main.py               # 入口點（可選）
├── requirements.txt      # Python 依賴
├── .env.example         # 環境變數範本
├── .gitignore           # Git 忽略檔案
├── app.yaml             # Google App Engine 設定
├── Procfile             # Heroku 設定
├── cloudrun.yaml        # Google Cloud Run 設定
├── README.md            # 本檔案
├── tasks.json           # 任務資料（執行時生成）
└── api_usage.json       # API 額度記錄（執行時生成）
```

---

## 🐛 除錯

### 檢查日誌
```bash
# Google Cloud Run
gcloud run logs read haodai-linebot --limit 100

# Replit
檢查 Console 標籤頁輸出
```

### 常見問題

**Q: 機器人不回覆訊息**
- 檢查 `LINE_CHANNEL_ACCESS_TOKEN` 和 `LINE_CHANNEL_SECRET` 是否正確
- 確認 Webhook URL 已在 LINE Developers 設置
- 檢查 `/callback` 端點是否正常運行

**Q: AI 回應失敗**
- 檢查 `PERPLEXITY_API_KEY` 是否正確
- 檢查月度額度是否用完（發送「額度」查詢）
- 確認網路連接正常

**Q: 任務無法保存**
- 確認應用程式有檔案系統寫入權限
- 檢查 `tasks.json` 是否存在或可建立

---

## 🤝 貢獻

有任何建議或發現 Bug？歡迎提 Issue 或 Pull Request！

---

## 📄 授權

本專案為個人使用專案。

---

## 🗂️ 工作流能力整理（WHO-46）

本段落保留這輪 Obsidian / vault / workflow 能力回填紀錄，後續細項已拆到 WHO-54 / WHO-55 追蹤。

### 這輪已完成

- [x] 建立 `local-note-workflow` skill
- [x] 將 note workflow 補成可直接生成 Markdown 的完整流程
- [x] 在 note workflow 內建輸出搬移能力
- [x] 在 note workflow 內建來源封存能力
- [x] 在 note workflow 內建成功後刪除來源能力
- [x] 建立 `obsidian-vault-workflow` skill
- [x] 補齊 Obsidian Vault MCP server 的直接操作說明
- [x] 新增 `search_notes` 檔名搜尋
- [x] 新增 `search_note_content` 內容搜尋
- [x] 新增 `create_folder` 建資料夾能力
- [x] 新增 `move_note` 搬移 / 改名能力
- [x] 新增 `delete_note` 刪除能力
- [x] 同步更新 vault server README
- [x] 同步更新 obsidian vault skill 說明
- [x] 驗證 `obsidian-vault-server` 可成功編譯

### 目前已具備的能力

#### 內容處理線

- `local-note-workflow`
- 可整理原始文字成可回收 Markdown
- 可在同一流程中移動輸出、封存來源、刪除來源

#### Vault 全操控線

- `obsidian-vault-workflow`
- 可列出 vault 項目
- 可依檔名搜尋
- 可依內容關鍵字搜尋
- 可讀取筆記
- 可寫入 / 覆蓋筆記
- 可追加內容
- 可快速 capture 到 inbox
- 可建立資料夾
- 可搬移 / 改名
- 可刪除
- 可操作 daily note 流程

### 後續可補（改在 WHO-54 / WHO-55）

- [x] 內容搜尋結果排序與摘要品質提升
- [x] frontmatter / tag 搜尋
- [ ] archive / trash 型操作，降低直接刪除風險
- [ ] 多檔批次操作
- [x] 更白話的使用手冊

---

## 問題反饋

如有問題，請：
1. 查看 [README](#) 的除錯段落
2. 檢查應用程式日誌
3. 測試環境變數是否正確設置

---

**最後更新：2026 年 4 月 12 日**
