# 📖 浩呆機器人 - 簡單部署指南

這份指南會一步步帶你上傳代碼到 GitHub 和部署到 Google Cloud。

---

## 步驟 1️⃣ ：在 GitHub 建立倉庫

### 網頁版操作（最簡單）
1. 開啟 https://github.com/new
2. Repository name：`haodai-linebot`
3. Description：`LINE Bot 機器人 - 浩呆 + 生活管家`
4. 選擇 **Public**（這樣 Google Cloud 可以部署）
5. 勾選「Add a README file」
6. 點擊 **Create repository**

你會得到一個像這樣的倉庫 URL：
```
https://github.com/love1795/haodai-linebot
```

---

## 步驟 2️⃣ ：上傳代碼到 GitHub

### 方法 A：使用 GitHub Desktop（推薦，最簡單）

1. **下載 GitHub Desktop**：https://desktop.github.com/
2. 登入你的 GitHub 帳號
3. **File → Clone Repository**
4. 貼上你的倉庫 URL：`https://github.com/love1795/haodai-linebot`
5. 選擇本機位置（例如 `C:\Users\EdgarsTool\Projects`）
6. 點擊 **Clone**

現在你在本機有一個 GitHub 資料夾了！

7. 將 `C:\Users\EdgarsTool\Projects\haodai-linebot\` 下的所有檔案（除了 `.git` 資料夾）複製到這個剛才 clone 的資料夾
8. 回到 GitHub Desktop
9. 你會看到很多檔案被標記為「Changes」
10. 在左下角輸入 commit message：`Initial commit: Add LINE Bot code`
11. 點擊 **Commit to main**
12. 點擊上方的 **Publish branch**

完成！你的代碼已經上傳到 GitHub 了 🎉

### 方法 B：使用 Git 命令列（進階）

如果你熟悉命令列，可以用：

```bash
# 進入你的項目目錄
cd C:\Users\EdgarsTool\Projects\haodai-linebot

# 初始化 Git
git init

# 添加所有檔案
git add .

# 提交
git commit -m "Initial commit: Add LINE Bot code"

# 添加遠端倉庫
git remote add origin https://github.com/love1795/haodai-linebot.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

---

## 步驟 3️⃣ ：設置 LINE Webhook URL

### 為什麼要做這步？
Google Cloud 會給你一個部署 URL，你需要在 LINE Developers 設置這個 URL，機器人才能收到訊息。

### 操作步驟
1. 先跳到步驟 4️⃣ 部署到 Google Cloud
2. 部署完成後，你會得到一個類似這樣的 URL：
   ```
   https://haodai-linebot-xxxxx.run.app
   ```
3. 回到 [LINE Developers Console](https://developers.line.biz/)
4. 選擇你的頻道
5. 進入「Messaging API」標籤
6. 找到「Webhook URL」
7. 填入：
   ```
   https://haodai-linebot-xxxxx.run.app/callback
   ```
   （將 `xxxxx` 替換成你實際的部署 URL）
8. 點擊「Verify」確認連接
9. 啟用「Use webhook」

---

## 步驟 4️⃣ ：部署到 Google Cloud Run

### 前置條件
- 已登入你的 Google Cloud 帳號：https://console.cloud.google.com/
- 已建立或選擇一個 GCP 專案
- 啟用了 Cloud Run 和 Cloud Build API

### 部署方式 A：使用 Google Cloud Console（推薦）

1. 開啟 [Google Cloud Console](https://console.cloud.google.com/)
2. 選擇你的專案（dropdown 在左上角）
3. 搜尋 **「Cloud Run」** 並進入
4. 點擊 **「建立服務」**
5. 選擇 **「從原始碼部署」**
   - 如果沒有此選項，點擊 **「設定 Cloud Run」**
6. **連結到 GitHub**
   - 點擊 **「連結倉庫」**
   - 授權 Google Cloud 存取你的 GitHub
   - 選擇倉庫：`love1795/haodai-linebot`
   - 分支：`main`
   - 建立模式：Root directory
7. **設定部署**
   - 服務名稱：`haodai-linebot`
   - 地區：`asia-east1` （台灣，速度最快）
   - 驗證：`允許未驗證的公開呼叫`
8. **展開「RUNTIME 設定」**
   - Port：`5000`
9. **環境變數**
   - 點擊 **「設定所有必要的環境變數」**
   - 添加以下變數：
     ```
     LINE_CHANNEL_ACCESS_TOKEN = 你的token
     LINE_CHANNEL_SECRET = 你的secret
     PERPLEXITY_API_KEY = 你的api_key
     USER_A_ID = 世鈞的LINE_ID
     USER_B_ID = 大人的LINE_ID
     REPORT_USER_ID = 報告接收者的LINE_ID（可選）
     MONTHLY_API_LIMIT = 500
     ```
10. 點擊 **「部署」**

部署會花 5-10 分鐘，完成後你會看到一個綠色的勾和一個 URL！

### 部署方式 B：使用 gcloud 命令列

如果你已安裝 [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)：

```bash
# 設置專案
gcloud config set project YOUR-PROJECT-ID

# 部署
gcloud run deploy haodai-linebot \
  --region asia-east1 \
  --allow-unauthenticated \
  --source https://github.com/love1795/haodai-linebot.git \
  --set-env-vars \
    LINE_CHANNEL_ACCESS_TOKEN=你的token,\
    LINE_CHANNEL_SECRET=你的secret,\
    PERPLEXITY_API_KEY=你的api_key,\
    USER_A_ID=世鈞的LINE_ID,\
    USER_B_ID=大人的LINE_ID,\
    MONTHLY_API_LIMIT=500
```

---

## 步驟 5️⃣ ：測試機器人

部署完成後，用你的 LINE 帳號私訊機器人試試看：

```
我的ID
```

如果機器人回覆你的 LINE ID，代表一切都設置正確了！🎉

試試其他指令：
```
待辦 測試一下
今天待辦
額度
```

---

## 🆘 常見問題

### Q1: 上傳到 GitHub 時出錯？
**答案**：
- 確認你已登入 GitHub Desktop
- 確認倉庫已經存在於 GitHub.com
- 如果還是有問題，用命令列方法試試

### Q2: Google Cloud 部署失敗？
**答案**：
- 檢查環境變數是否全部填入
- 確認倉庫是 Public 的
- 檢查 Cloud Build 和 Cloud Run API 是否啟用

### Q3: 機器人收不到訊息？
**答案**：
- 檢查 Webhook URL 是否正確設置在 LINE Developers
- 檢查環境變數 `LINE_CHANNEL_ACCESS_TOKEN` 和 `LINE_CHANNEL_SECRET` 是否正確
- 嘗試在 LINE Developers 點擊「Verify」測試連接

### Q4: 如何查看部署日誌？
**答案**：
1. 開啟 Google Cloud Console
2. 進入 Cloud Run
3. 點擊 `haodai-linebot` 服務
4. 進入「日誌」標籤

### Q5: 如何更新代碼？
**答案**：
1. 在本機修改代碼
2. 用 GitHub Desktop 或 git 推送更新
3. Google Cloud 會自動偵測到更新並重新部署（約 2-5 分鐘）

---

## 📱 LINE 功能速查表

| 指令 | 功能 |
|------|------|
| `待辦 買牛奶` | 新增今天的待辦 |
| `今天待辦` | 查看今天的待辦 |
| `完成 1` | 完成第 1 筆待辦 |
| `小結` | 今天和明天摘要 |
| `提醒 看牙醫 2025-12-01 15:00` | 設置提醒 |
| `額度` | 查看 AI 額度 |
| `我的ID` | 查看自己的 LINE ID |

---

## 🎯 下一步（可選）

### 設置自動報告（Make.com）
1. 前往 https://www.make.com/
2. 新建一個場景
3. 設置每天早上 8:00 呼叫：
   ```
   https://haodai-linebot-xxxxx.run.app/cron-daily-report
   ```

### 連接 Notion
1. 前往 Notion Developers 建立整合
2. 設置 `NOTION_TOKEN` 和 `NOTION_DATABASE_ID`
3. 新增任務時將自動同步到 Notion

### 設置自動提醒（Make.com）
1. 建立場景每分鐘呼叫：
   ```
   https://haodai-linebot-xxxxx.run.app/reminders-check
   ```
2. 自動發送提醒訊息

---

## ✅ 完成清單

- [ ] 在 GitHub 建立倉庫
- [ ] 上傳代碼
- [ ] 部署到 Google Cloud
- [ ] 設置 LINE Webhook URL
- [ ] 測試機器人
- [ ] 設置環境變數
- [ ] 關聯 LINE 帳號（可選 - 用「我的ID」指令）

---

## 📞 需要幫助？

如果有問題，可以檢查：
1. [README.md](./README.md) - 詳細說明
2. Google Cloud 日誌
3. LINE Developers Console 的 Webhook 測試

祝你部署順利！🚀
