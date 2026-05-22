# S7-03 分批搬遷執行紀錄

> **目的**：記錄正式 repo 與工作檔的分批搬遷過程，確保每批完成後立即驗證可用性。
> **版本**：v1.0
> **建立日期**：2026-05-03
> **相關 Issue**：WHO-41 / S7-03
> **前置文件**：[S7-02 搬遷對應表](./S7-02-migration-mapping.md)

---

## 圖例說明

| 狀態符號 | 意義 |
|---------|------|
| ✅ 已完成 | 搬遷完成並通過驗證 |
| 🔄 進行中 | 搬遷中，尚未驗證 |
| ⏳ 待執行 | 排程中，尚未開始 |
| ❌ 失敗 | 搬遷失敗或驗證未通過，需修復 |
| ⚠️ 待修 | 有問題但不阻礙其他批次繼續 |
| 🚫 跳過 | 依對應表確認不搬遷 |

---

## 搬遷範圍總覽

依 S7-02 對應表，正式搬遷項目共分三批執行：

| 批次 | 對應 S7-02 Phase | 項目數 | 目標資料夾 |
|------|-----------------|--------|-----------|
| Batch 1 | Phase 1 — 正式專案類 | 6 | `Projects/haodai-linebot/` |
| Batch 2 | Phase 2 — 知識與資料類 | 3 | `Projects/haodai-linebot/` / `Agent-KB/` |
| Batch 3 | Phase 3 — 暫存與封存類 | 2 | `Projects/haodai-linebot/` |

---

## Batch 1 — Phase 1 正式專案類（核心運行檔）

> **搬遷優先度**：最高。這些是應用程式的核心執行檔，必須最先確認正確到位。

### 搬遷項目

| # | 來源路徑 | 狀態 | 目標路徑 | 備註 |
|---|---------|------|---------|------|
| 1 | `app.py` | ⏳ 待執行 | `Projects/haodai-linebot/app.py` | 主應用程式，Flask webhook 處理 |
| 2 | `main.py` | ⏳ 待執行 | `Projects/haodai-linebot/main.py` | Flask 入口點 |
| 3 | `requirements.txt` | ⏳ 待執行 | `Projects/haodai-linebot/requirements.txt` | Python 依賴清單 |
| 4 | `Procfile` | ⏳ 待執行 | `Projects/haodai-linebot/Procfile` | Heroku 部署設定 |
| 5 | `app.yaml` | ⏳ 待執行 | `Projects/haodai-linebot/app.yaml` | Google App Engine 設定 |
| 6 | `cloudrun.yaml` | ⏳ 待執行 | `Projects/haodai-linebot/cloudrun.yaml` | Google Cloud Run 設定 |

### Batch 1 驗證清單

執行完 Batch 1 後，依序確認：

#### 路徑驗證

- [ ] `Projects/haodai-linebot/app.py` 存在
- [ ] `Projects/haodai-linebot/main.py` 存在
- [ ] `Projects/haodai-linebot/requirements.txt` 存在且內容完整
- [ ] `Projects/haodai-linebot/Procfile` 存在
- [ ] `Projects/haodai-linebot/app.yaml` 存在
- [ ] `Projects/haodai-linebot/cloudrun.yaml` 存在

#### Git 狀態驗證

```powershell
cd C:\Users\EdgarsTool\Projects\haodai-linebot
git remote -v        # 確認 remote URL 為 Edgars-tool/haodai-linebot
git status           # 確認 working tree clean
git log --oneline -3 # 確認可讀取最近提交
```

- [ ] `git remote -v` 顯示正確 GitHub URL（`Edgars-tool/haodai-linebot`）
- [ ] `git status` 顯示 `nothing to commit, working tree clean`
- [ ] `git log` 可正常顯示提交紀錄

#### 啟動方式驗證

```powershell
cd C:\Users\EdgarsTool\Projects\haodai-linebot
python -m py_compile app.py main.py   # 確認無語法錯誤
python -m pip install -r requirements.txt --dry-run  # 確認依賴可安裝
```

- [ ] `app.py` 通過 `py_compile` 語法檢查
- [ ] `main.py` 通過 `py_compile` 語法檢查
- [ ] `requirements.txt` 中所有套件可正常安裝

### Batch 1 執行紀錄

| 執行日期 | 執行者 | 通過項目 / 總項目 | 備註 |
|---------|--------|-----------------|------|
|         |        |                 |      |

---

## Batch 2 — Phase 2 知識與資料類（說明文件）

> **搬遷優先度**：次高。文件完整性影響可維護性，且 `docs/` 需搬至 Agent-KB 以利代理人查詢。

### 搬遷項目

| # | 來源路徑 | 狀態 | 目標路徑 | 目標資料夾 | 備註 |
|---|---------|------|---------|-----------|------|
| 7 | `README.md` | ⏳ 待執行 | `Projects/haodai-linebot/README.md` | Projects | 專案說明文件 |
| 8 | `DEPLOYMENT_GUIDE.md` | ⏳ 待執行 | `Projects/haodai-linebot/DEPLOYMENT_GUIDE.md` | Projects | 部署操作手冊 |
| 9 | `docs/` | ⏳ 待執行 | `Agent-KB/haodai-linebot/docs/` | Agent-KB | 規劃文件、搬遷對應表等知識文件 |

### Batch 2 驗證清單

#### 路徑驗證

- [ ] `Projects/haodai-linebot/README.md` 存在且可正常讀取
- [ ] `Projects/haodai-linebot/DEPLOYMENT_GUIDE.md` 存在且連結未斷裂
- [ ] `Agent-KB/haodai-linebot/docs/` 目錄存在
- [ ] `Agent-KB/haodai-linebot/docs/S7-02-migration-mapping.md` 存在
- [ ] `Agent-KB/haodai-linebot/docs/S7-03-migration-execution-log.md` 存在

#### 內容完整性驗證

- [ ] `README.md` 內文件結構說明與實際目錄相符
- [ ] `DEPLOYMENT_GUIDE.md` 中的路徑與部署指令仍有效
- [ ] `docs/` 目錄中所有文件均已複製，無遺漏

#### Agent-KB 可用性驗證

- [ ] 代理人可從 `Agent-KB/haodai-linebot/docs/` 讀取規劃文件
- [ ] S7-02 對應表可正常查閱

### Batch 2 執行紀錄

| 執行日期 | 執行者 | 通過項目 / 總項目 | 備註 |
|---------|--------|-----------------|------|
|         |        |                 |      |

---

## Batch 3 — Phase 3 暫存與封存類（設定檔）

> **搬遷優先度**：一般。設定範本與 Git 規則需與專案主體一起到位。

### 搬遷項目

| # | 來源路徑 | 狀態 | 目標路徑 | 備註 |
|---|---------|------|---------|------|
| 10 | `.env.example` | ⏳ 待執行 | `Projects/haodai-linebot/.env.example` | 環境變數範本，公開安全，隨專案搬 |
| 11 | `.gitignore` | ⏳ 待執行 | `Projects/haodai-linebot/.gitignore` | Git 忽略規則，隨專案搬 |

### 不搬遷項目（已確認）

| # | 來源路徑 | 狀態 | 原因 |
|---|---------|------|------|
| 12 | `tasks.json` | 🚫 跳過 | Runtime 自動生成，不納入搬遷 |
| 13 | `api_usage.json` | 🚫 跳過 | Runtime 自動生成，不納入搬遷 |

### Batch 3 驗證清單

#### 路徑驗證

- [ ] `Projects/haodai-linebot/.env.example` 存在
- [ ] `Projects/haodai-linebot/.gitignore` 存在

#### 設定檔內容驗證

- [ ] `.env.example` 包含所有必要的環境變數欄位：
  - [ ] `LINE_CHANNEL_ACCESS_TOKEN`
  - [ ] `LINE_CHANNEL_SECRET`
  - [ ] `PERPLEXITY_API_KEY`
  - [ ] `USER_A_ID`、`USER_B_ID`、`REPORT_USER_ID`（選填）
  - [ ] `NOTION_TOKEN`、`NOTION_DATABASE_ID`（選填）
  - [ ] `MAKE_WEBHOOK_URL`（選填）
  - [ ] `MONTHLY_API_LIMIT`（選填）
- [ ] `.gitignore` 包含以下條目（確認敏感檔案不被追蹤）：
  - [ ] `.env`
  - [ ] `tasks.json`
  - [ ] `api_usage.json`
  - [ ] `__pycache__/`
  - [ ] `venv/` / `ENV/`

### Batch 3 執行紀錄

| 執行日期 | 執行者 | 通過項目 / 總項目 | 備註 |
|---------|--------|-----------------|------|
|         |        |                 |      |

---

## 受影響的入口、腳本與設定

> 搬遷後需更新以下項目，確保路徑引用正確。

### 腳本路徑更新

| 腳本 | 舊路徑 | 新路徑 | 狀態 |
|------|--------|--------|------|
| `auto_pull_and_test.ps1` | （舊工作區）`scripts/auto_pull_and_test.ps1` | `Projects/haodai-linebot/scripts/auto_pull_and_test.ps1` | ⏳ 待確認 |
| `preflight_check.py` | （舊工作區）`scripts/preflight_check.py` | `Projects/haodai-linebot/scripts/preflight_check.py` | ⏳ 待確認 |

### 代理人入口更新

| 代理人 / 工具 | 設定項目 | 舊路徑 | 新路徑 | 狀態 |
|-------------|---------|--------|--------|------|
| GitHub Copilot / 代理模式 | workspace root | （舊工作區） | `Projects/haodai-linebot/` | ⏳ 待確認 |
| 浩呆 LINE Bot | webhook URL | （Cloud Run 現有 URL）| （搬遷後驗證不變）| ⏳ 待確認 |
| Make.com | `/reminders-check` 端點 | （Cloud Run 現有 URL） | （搬遷後驗證不變）| ⏳ 待確認 |

### 開發工具路徑設定更新

| 工具 | 需更新的設定 | 狀態 |
|------|------------|------|
| VS Code / Cursor | workspace 根目錄路徑 | ⏳ 待確認 |
| PowerShell 預設工作目錄 | `$PROFILE` 或 Terminal 設定 | ⏳ 待確認 |
| Git config（本機） | 確認 `core.autocrlf` 等設定未因搬遷而遺失 | ⏳ 待確認 |

### 捷徑更新

| 捷徑名稱 | 舊目標路徑 | 新目標路徑 | 狀態 |
|---------|----------|----------|------|
| （桌面捷徑或 Terminal profile，依實際設定填入） | — | — | ⏳ 待確認 |

---

## 例外標記（不搬遷項目彙整）

| # | 項目 | 狀態 | 原因 |
|---|------|------|------|
| 14 | `.env` | 🚫 不搬遷 | 含 secrets，不進版控；部署平台個別設定 |
| 15 | `__pycache__/` | 🚫 不搬遷 | Python 快取，本地重建，不搬 |
| 16 | `venv/` / `ENV/` | 🚫 不搬遷 | 虛擬環境，本地重建，不搬 |
| 17 | `*.log` | 🚫 不搬遷 | 執行期日誌，若需留存移至 `Archive/` |
| 18 | AI 回應快取 | ❓ 待判定 | 尚無快取機制；若日後實作需另訂規範 |
| 19 | 實驗性功能分支 | ❓ 待判定 | 尚未確認是否有需要保留的實驗分支 |
| 20 | 孵化中的功能構想 | ❓ 待判定 | 需確認是否有未合併的 feature 想法文件 |
| 21 | Obsidian vault 相關筆記 | ❓ 待判定 | 需確認是否有 Obsidian 筆記與本專案相關 |
| 22 | 舊版程式碼備份 | ⏳ 延後處理 | 目前版本活躍，舊版備份延後整理 |
| 23 | 匯出資料 / 報表 | ⏳ 延後處理 | 尚無匯出資料需求，延後處理 |

---

## 待修清單（Pending Fix List）

> 以下項目在搬遷過程中發現問題，需後續修復。請在確認後更新狀態與解決方式。

| # | 項目描述 | 嚴重度 | 發現批次 | 狀態 | 解決方式 |
|---|---------|--------|---------|------|---------|
| F-01 | （預留：搬遷後如有路徑錯誤於此記錄） | — | — | ⏳ 待填入 | — |
| F-02 | （預留：代理人入口更新如有失敗於此記錄） | — | — | ⏳ 待填入 | — |
| F-03 | （預留：腳本路徑引用錯誤於此記錄） | — | — | ⏳ 待填入 | — |

> **嚴重度說明**：🔴 阻礙性 / 🟡 重要 / 🟢 輕微

---

## 整體執行進度摘要

| 批次 | 開始日期 | 完成日期 | 通過率 | 備註 |
|------|---------|---------|--------|------|
| Batch 1 — 核心運行檔 | | | | |
| Batch 2 — 知識與資料 | | | | |
| Batch 3 — 設定檔 | | | | |

---

## 完成標準確認

- [ ] 正式 repo 已搬到對應主位置（`Projects/haodai-linebot/`）
- [ ] 每批搬遷後都有驗證結果（路徑、Git 狀態、啟動）
- [ ] 受影響的入口與腳本已記錄（見「受影響的入口、腳本與設定」一節）
- [ ] 未完成項目已標記待修（見「待修清單」一節）

---

*最後更新：2026-05-03 | 對應 Linear Issue: WHO-41 / S7-03*
