> 繁體中文版。原始文件：app.py（英文）

# app.py 技術解說

> 此檔案超過 500 行，本文件僅解說前 100 行；其餘內容略。

## 這個檔案做什麼
`app.py` 是 haodai-linebot 的核心 Flask（Web 框架）應用程式，負責載入環境變數、執行啟動前檢查、初始化 LINE Webhook（回呼）處理器，並承載後續的聊天、任務與提醒相關邏輯。

## 主要區塊說明
1. **模組匯入與 logging（日誌）設定**
   - 前幾行匯入 `os`、`json`、`logging`、`requests`、`Flask` 等基礎模組。
   - `logging.basicConfig(level=logging.INFO)` 用來設定全域日誌等級。
2. **Flask app 初始化**
   - `app = Flask(__name__)` 建立主應用物件。
3. **環境變數讀取**
   - 載入 `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、`PERPLEXITY_API_KEY`、`REPORT_USER_ID`、`USER_A_ID`、`USER_B_ID`。
   - 若個別使用者 ID 缺失，只記錄 warning（警告），不中止程式。
4. **狀態檔案與限額設定**
   - 使用 `tasks.json`、`api_usage.json` 作為執行期資料檔。
   - `MONTHLY_API_LIMIT` 定義 AI 使用量上限。
5. **`preflight_check()` 啟動前檢查**
   - 驗證必要環境變數是否存在。
   - 驗證狀態檔案是否可讀，若檔案不存在則測試寫入權限。
   - 任何失敗都會 `SystemExit`，避免服務在損壞狀態下啟動。
6. **LINE SDK 初始化**
   - 若 LINE 憑證齊全，就初始化 `WebhookHandler` 與 `Configuration`。
   - 若缺失，會保留 Flask app，但 webhook 功能無法運作。
7. **`HAODAI_SYSTEM_PROMPT` 起始區塊**
   - 從前 100 行尾端開始定義機器人角色口吻與背景設定。
   - 後續完整 prompt 與訊息處理邏輯未在本文件展開；其餘內容略。

## 常用指令
```bash
python app.py
```

```bash
gunicorn -b :5000 app:app
```

## 注意事項
- `LINE_CHANNEL_ACCESS_TOKEN`、`LINE_CHANNEL_SECRET`、`PERPLEXITY_API_KEY` 缺一不可。
- 服務需要對 `tasks.json` 與 `api_usage.json` 具備寫入權限。
- 檔案後半段未展開的 webhook、任務管理與提醒邏輯仍是主要商業邏輯；其餘內容略。
