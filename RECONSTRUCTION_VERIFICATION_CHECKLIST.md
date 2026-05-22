# ✅ S8-01 重建完成驗證清單

> 本清單用於重建／搬遷完成後，依序逐條確認系統狀態正確，避免只靠臨時想到的項目做驗證。
> 每條項目皆可獨立勾選，請由上至下依序執行。

---

## 優先層級說明

| 標籤 | 意義 |
|------|------|
| 🔴 **必驗** | 重建後最低限度必須通過，未通過代表系統不可用 |
| 🟡 **建議驗** | 建議在部署後 24 小時內確認，影響穩定性或功能完整性 |
| 🟢 **可延後驗** | 可在正式上線後擇期確認，影響範圍較小或有備援 |

---

## 一、路徑與結構驗證

### 🔴 必驗

- [ ] 專案根目錄路徑正確，可正常進入
- [ ] `app.py` 存在於根目錄（主程式）
- [ ] `main.py` 存在於根目錄（入口點）
- [ ] `requirements.txt` 存在且內容完整
- [ ] `.env.example` 存在，且包含所有必要環境變數欄位
- [ ] `.gitignore` 存在，且包含 `.env`、`tasks.json`、`api_usage.json`
- [ ] `cloudrun.yaml` 存在（Google Cloud Run 設定）
- [ ] `Procfile` 存在（Heroku 設定）

### 🟡 建議驗

- [ ] `app.yaml` 存在（Google App Engine 設定）
- [ ] `README.md` 存在且內容可正常讀取
- [ ] `DEPLOYMENT_GUIDE.md` 存在且連結未斷裂
- [ ] 確認無多餘目錄或誤放的檔案在根目錄

### 🟢 可延後驗

- [ ] 文件結構與 `README.md` 中的「文件結構」一節相符
- [ ] 確認無重複的設定檔（例如多個 Dockerfile 或 app.yaml 變體）

---

## 二、Repo 與 Git 驗證

### 🔴 必驗

- [ ] `git remote -v` 顯示正確的 GitHub 倉庫 URL（`Edgars-tool/haodai-linebot`）
- [ ] `git status` 顯示乾淨狀態（working tree clean，無未提交的變更）
- [ ] `git log --oneline -5` 可正常顯示最近提交紀錄
- [ ] 主分支（`main`）存在且為最新狀態

### 🟡 建議驗

- [ ] 確認本地 `main` 與 `origin/main` 無落後（`git fetch` 後比對）
- [ ] 確認無遺留的開發分支未合併
- [ ] 確認 `.gitignore` 有效，敏感檔案（`.env`）未被追蹤

### 🟢 可延後驗

- [ ] 確認 GitHub Actions / CI 工作流程設定正確（若有）
- [ ] 確認 branch protection rules 設定正確（若有）

---

## 三、工具與代理入口驗證

### 🔴 必驗

- [ ] Python 版本符合要求（`python --version` ≥ 3.9）
- [ ] 依賴套件可正常安裝：`pip install -r requirements.txt` 無錯誤
- [ ] `app.py` 可正常啟動：`python app.py` 無語法錯誤或 import 失敗
- [ ] 服務啟動後 `http://localhost:5000` 可正常回應（首頁顯示機器人狀態）
- [ ] `/callback` 端點存在並可接收 POST 請求（LINE Webhook 入口）
- [ ] LINE Developers Console 中 Webhook URL 指向正確的部署 URL
- [ ] LINE Webhook「Verify」測試通過

### 🟡 建議驗

- [ ] `/reminders-check` 端點可正常回應（GET 請求，Make.com 用）
- [ ] `/cron-daily-report` 端點可正常回應（GET 請求，每日報告用）
- [ ] `/reminders-mark-sent` 端點可正常接收 POST 請求
- [ ] 在 LINE 對話中發送「我的ID」可取得正確的 LINE ID 回應

### 🟢 可延後驗

- [ ] Make.com 場景設定正確，每分鐘呼叫 `/reminders-check`
- [ ] Make.com 每日報告場景可正常觸發
- [ ] Google Cloud Run 服務版本為最新部署

---

## 四、資料完整性與斷鏈驗證

### 🔴 必驗

- [ ] 環境變數 `LINE_CHANNEL_ACCESS_TOKEN` 已設置且有效
- [ ] 環境變數 `LINE_CHANNEL_SECRET` 已設置且有效
- [ ] 環境變數 `PERPLEXITY_API_KEY` 已設置且有效
- [ ] 在 LINE 中發送「額度」可取得正確的 AI 使用量回應（確認 API 連線）
- [ ] 在 LINE 中新增待辦（`待辦 測試`）可正常儲存與回應
- [ ] 在 LINE 中查詢待辦（`今天待辦`）可正常讀取資料

### 🟡 建議驗

- [ ] `tasks.json`（若已存在）格式為合法 JSON，無損壞
- [ ] `api_usage.json`（若已存在）格式為合法 JSON，無損壞
- [ ] 環境變數 `USER_A_ID` 與 `USER_B_ID` 已設置（個人提醒功能）
- [ ] 環境變數 `REPORT_USER_ID` 已設置（每日報告功能）
- [ ] 確認舊資料（任務、提醒）未遺失、未重複、未誤放

### 🟢 可延後驗

- [ ] Notion 整合可正常同步任務（若有使用 `NOTION_TOKEN`）
- [ ] `NOTION_DATABASE_ID` 對應的資料庫可正常存取
- [ ] `MONTHLY_API_LIMIT` 設置值符合預期（預設 500）
- [ ] `MAKE_WEBHOOK_URL` 設置正確（若有使用 Make.com Webhook）

---

## 五、功能完整性快速冒煙測試

> 以下為在 LINE 對話中的手動測試指令，逐條執行確認基本功能正常。

### 🔴 必驗（最少冒煙測試）

- [ ] 傳送：`我的ID` → 回應為有效的 LINE User ID
- [ ] 傳送：`待辦 重建驗證測試` → 確認新增成功的回應
- [ ] 傳送：`今天待辦` → 清單中包含剛才新增的項目
- [ ] 傳送：`完成 1`（或對應序號）→ 確認完成成功的回應
- [ ] 傳送：`額度` → 顯示本月 AI 使用量

### 🟡 建議驗

- [ ] 傳送：`小結` → 顯示今天與明天的任務摘要
- [ ] 傳送：`本週待辦` → 顯示本週任務清單
- [ ] 傳送：`誰還沒做` → 顯示各擁有者未完成任務統計
- [ ] 傳送：`提醒 測試提醒 [明天日期] 10:00` → 確認提醒新增成功

### 🟢 可延後驗

- [ ] 傳送：`整理成待辦：幫我列三件事` → AI 自動拆解為多筆待辦（需 AI 額度）
- [ ] 確認每日提醒在設定時間正確發送
- [ ] 確認自動提醒（Make.com 觸發）正常發送

---

## 執行紀錄

| 驗證日期 | 執行者 | 通過項目數 / 總項目數 | 備註 |
|---------|--------|----------------------|------|
|         |        |                      |      |

---

## 未通過項目處理原則

1. **🔴 必驗未通過**：立即停止並修復，未修復前系統視為不可用
2. **🟡 建議驗未通過**：記錄問題，於 24 小時內排入修復
3. **🟢 可延後驗未通過**：記錄問題，安排後續 Sprint 修復

---

*最後更新：2026-04-18 | 對應 Linear Issue: WHO-43*
