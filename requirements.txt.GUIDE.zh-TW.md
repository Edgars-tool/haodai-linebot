> 繁體中文版。原始文件：requirements.txt（英文）

# requirements.txt 技術解說

## 這個檔案做什麼
這個檔案列出 Python dependency（依賴套件），讓開發與部署環境能安裝一致版本。

## 主要區塊說明
1. **`Flask==2.3.3`**：提供 Web server（網頁服務）與 route（路由）能力。
2. **`line-bot-sdk==3.11.0`**：處理 LINE Messaging API 的 webhook 與訊息回覆。
3. **`requests==2.31.0`**：用於呼叫外部 HTTP API，例如 Perplexity。
4. **`python-dotenv==1.0.0`**：協助從 `.env` 載入環境變數。

## 常用指令
```bash
pip install -r requirements.txt
```

```bash
pip freeze
```

## 注意事項
- 這份清單採固定版本（pinned version，鎖定版本），可降低部署環境差異。
- 如果新增套件，應同步更新部署環境並重新驗證啟動流程。
