> 繁體中文版。原始文件：DEPLOYMENT_GUIDE.md（英文）

# 📖 浩呆機器人部署指南

這份文件說明如何把專案上傳到 GitHub，並部署到 Google Cloud Run。

## 步驟 1：在 GitHub 建立 repository（倉庫）

### 網頁版操作
1. 開啟 https://github.com/new
2. Repository name：`haodai-linebot`
3. Description：`LINE Bot 機器人 - 浩呆 + 生活管家`
4. 建議選擇 **Public**
5. 可勾選「Add a README file」
6. 點擊 **Create repository**

建立後會得到類似下列網址：
```
https://github.com/love1795/haodai-linebot
```

## 步驟 2：將程式碼上傳到 GitHub

### 方法 A：GitHub Desktop（推薦）
1. 下載 GitHub Desktop：https://desktop.github.com/
2. 登入 GitHub 帳號
3. **File → Clone Repository**
4. 輸入 repository URL
5. 選擇本機資料夾
6. 按 **Clone**
7. 將專案檔案複製進 clone 下來的資料夾（不要覆蓋 `.git`）
8. 回到 GitHub Desktop，確認變更清單
9. 輸入 commit message（提交訊息）
10. 點擊 **Commit to main**
11. 點擊 **Publish branch**

### 方法 B：Git command line（命令列）
```bash
cd C:\Users\Windows10-JS\Desktop\haodai-linebot
git init
git add .
git commit -m "Initial commit: Add LINE Bot code"
git remote add origin https://github.com/love1795/haodai-linebot.git
git branch -M main
git push -u origin main
```

## 步驟 3：設定 LINE Webhook URL
1. 先完成 Cloud Run 部署
2. 取得服務網址，例如：
   ```
   https://haodai-linebot-xxxxx.run.app
   ```
3. 回到 [LINE Developers Console](https://developers.line.biz/)
4. 進入 Messaging API 頁面
5. 在 Webhook URL 欄位填入：
   ```
   https://haodai-linebot-xxxxx.run.app/callback
   ```
6. 點擊 Verify（驗證）
7. 開啟「Use webhook」

## 步驟 4：部署到 Google Cloud Run

### 前置條件
- 已登入 Google Cloud
- 已建立或選定一個 GCP project（專案）
- 已啟用 Cloud Run 與 Cloud Build API

### 方式 A：Google Cloud Console（推薦）
1. 開啟 [Google Cloud Console](https://console.cloud.google.com/)
2. 進入 Cloud Run
3. 點擊 **建立服務**
4. 選擇 **從原始碼部署**
5. 連結 GitHub repository
6. 設定：
   - 服務名稱：`haodai-linebot`
   - 地區：`asia-east1`
   - 驗證：允許未驗證呼叫
7. 設定 port（連接埠）為 `5000`
8. 加入環境變數：
   ```
   LINE_CHANNEL_ACCESS_TOKEN = 你的token
   LINE_CHANNEL_SECRET = 你的secret
   PERPLEXITY_API_KEY = 你的api_key
   USER_A_ID = 世鈞的LINE_ID
   USER_B_ID = 大人的LINE_ID
   REPORT_USER_ID = 報告接收者的LINE_ID（可選）
   MONTHLY_API_LIMIT = 500
   ```
9. 點擊 **部署**

### 方式 B：gcloud CLI
```bash
gcloud config set project YOUR-PROJECT-ID

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

## 步驟 5：測試機器人
部署完成後，使用 LINE 私訊機器人：
```
我的ID
```
若有正確回覆，代表 webhook 與憑證設定成功。

也可測試：
```
待辦 測試一下
今天待辦
額度
```

## 🆘 常見問題

### 上傳到 GitHub 失敗
- 確認已登入 GitHub Desktop
- 確認 repository 已建立
- 可改用命令列方式重新推送

### Google Cloud 部署失敗
- 檢查環境變數是否完整
- 確認 repository 可被 Cloud Build 存取
- 確認 Cloud Build / Cloud Run API 已啟用

### 機器人收不到訊息
- 檢查 LINE Developers 的 Webhook URL
- 檢查 `LINE_CHANNEL_ACCESS_TOKEN` 與 `LINE_CHANNEL_SECRET`
- 在 LINE Developers 重新執行 Verify

### 如何查看日誌
1. 開啟 Google Cloud Console
2. 進入 Cloud Run
3. 選擇 `haodai-linebot`
4. 查看「日誌」標籤

### 如何更新程式碼
1. 在本機修改程式
2. 推送到 GitHub
3. 等待 Cloud Run 重新部署

## 📱 LINE 指令速查
| 指令 | 功能 |
|------|------|
| `待辦 買牛奶` | 新增今天待辦 |
| `今天待辦` | 查看今天待辦 |
| `完成 1` | 完成第 1 筆任務 |
| `小結` | 查看今天與明天摘要 |
| `提醒 看牙醫 2025-12-01 15:00` | 設定提醒 |
| `額度` | 查看 AI 額度 |
| `我的ID` | 查看自己的 LINE ID |

## 🎯 後續可做的事
- 設定 Make.com 自動報告
- 設定 Notion 同步
- 設定 `/reminders-check` 自動提醒流程

## ✅ 完成檢查表
- [ ] 建立 GitHub repository
- [ ] 上傳程式碼
- [ ] 完成 Cloud Run 部署
- [ ] 設定 LINE Webhook URL
- [ ] 測試機器人
- [ ] 設定環境變數
- [ ] 綁定 LINE 帳號（如有需要）
