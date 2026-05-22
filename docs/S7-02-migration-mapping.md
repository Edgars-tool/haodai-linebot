# S7-02 搬遷對應表（舊位置 → 新位置）

> **目的**：在實際搬移前先建立完整對應關係，避免分類漂移或重複搬遷。
> **版本**：v1.0
> **建立日期**：2026-04-18
> **相關 Issue**：WHO-40 / S7-02

---

## 圖例說明

| 狀態符號 | 意義 |
|---------|------|
| ✅ 正式搬遷 | 確定搬、目標路徑已定 |
| 🔄 暫放 | 先移到暫存區，後續再整理 |
| ⏳ 延後處理 | 此階段暫不搬，留原位 |
| ❓ 待判定 | 去向尚未確認，需進一步討論 |
| 🚫 不搬遷 | 確定留在原位或由其他流程處理 |

---

## 搬遷優先順序

1. **Phase 1 — 正式專案類**（app.py、main.py、requirements.txt 等核心運行檔）
2. **Phase 2 — 知識與資料類**（README.md、DEPLOYMENT_GUIDE.md、文件）
3. **Phase 3 — 暫存與封存類**（設定檔、部署設定、舊版本備份）
4. **Phase 4 — 例外標記**（runtime 生成檔、secrets、待判定項目）

---

## Phase 1 — 正式專案類

| # | 舊路徑（來源） | 狀態 | 新路徑（目標） | 目標資料夾 | 備註 |
|---|-------------|------|--------------|-----------|------|
| 1 | `app.py` | ✅ 正式搬遷 | `Projects/haodai-linebot/app.py` | Projects | 主應用程式，核心檔案 |
| 2 | `main.py` | ✅ 正式搬遷 | `Projects/haodai-linebot/main.py` | Projects | Flask 入口點 |
| 3 | `requirements.txt` | ✅ 正式搬遷 | `Projects/haodai-linebot/requirements.txt` | Projects | Python 依賴清單 |
| 4 | `Procfile` | ✅ 正式搬遷 | `Projects/haodai-linebot/Procfile` | Projects | Heroku 部署設定 |
| 5 | `app.yaml` | ✅ 正式搬遷 | `Projects/haodai-linebot/app.yaml` | Projects | Google App Engine 設定 |
| 6 | `cloudrun.yaml` | ✅ 正式搬遷 | `Projects/haodai-linebot/cloudrun.yaml` | Projects | Google Cloud Run 設定 |

---

## Phase 2 — 知識與資料類

| # | 舊路徑（來源） | 狀態 | 新路徑（目標） | 目標資料夾 | 備註 |
|---|-------------|------|--------------|-----------|------|
| 7 | `README.md` | ✅ 正式搬遷 | `Projects/haodai-linebot/README.md` | Projects | 專案說明文件，隨專案一起搬 |
| 8 | `DEPLOYMENT_GUIDE.md` | ✅ 正式搬遷 | `Projects/haodai-linebot/DEPLOYMENT_GUIDE.md` | Projects | 部署操作手冊，隨專案一起搬 |
| 9 | `docs/` *(此目錄)* | ✅ 正式搬遷 | `Agent-KB/haodai-linebot/docs/` | Agent-KB | 規劃文件、搬遷對應表等知識文件 |

---

## Phase 3 — 暫存與封存類

| # | 舊路徑（來源） | 狀態 | 新路徑（目標） | 目標資料夾 | 備註 |
|---|-------------|------|--------------|-----------|------|
| 10 | `.env.example` | ✅ 正式搬遷 | `Projects/haodai-linebot/.env.example` | Projects | 環境變數範本，公開安全，隨專案搬 |
| 11 | `.gitignore` | ✅ 正式搬遷 | `Projects/haodai-linebot/.gitignore` | Projects | Git 忽略規則，隨專案搬 |
| 12 | `tasks.json` *(runtime 生成)* | 🚫 不搬遷 | — | — | 執行時自動生成，不納入搬遷；由 `.gitignore` 排除 |
| 13 | `api_usage.json` *(runtime 生成)* | 🚫 不搬遷 | — | — | 執行時自動生成，不納入搬遷；由 `.gitignore` 排除 |

---

## Phase 4 — 例外標記

| # | 舊路徑（來源） | 狀態 | 新路徑（目標） | 目標資料夾 | 備註 |
|---|-------------|------|--------------|-----------|------|
| 14 | `.env` *(本機密鑰)* | 🚫 不搬遷 | — | Private-Staging | 含 secrets，不進版控；部署平台個別設定 |
| 15 | `__pycache__/` | 🚫 不搬遷 | — | — | Python 快取，不搬；由 `.gitignore` 排除 |
| 16 | `venv/` / `ENV/` | 🚫 不搬遷 | — | — | 虛擬環境，本地重建，不搬 |
| 17 | 日誌檔案 `*.log` | 🚫 不搬遷 | — | — | 執行期產生，不搬；若需留存移至 `Archive/` |
| 18 | 未來 AI 回應快取 | ❓ 待判定 | `AI-Cache/haodai-linebot/` *(暫定)* | AI-Cache | 目前尚無快取機制；若日後實作需另訂規範 |
| 19 | 實驗性功能分支 | ❓ 待判定 | `Sandbox/haodai-linebot-exp/` *(暫定)* | Sandbox | 尚未確認是否有需要保留的實驗分支 |
| 20 | 孵化中的新功能構想 | ❓ 待判定 | `Incubator/haodai-linebot-ideas/` *(暫定)* | Incubator | 需確認是否有未合併的 feature 想法文件 |
| 21 | Obsidian vault 相關筆記 | ❓ 待判定 | `Obsidian/haodai-linebot/` *(暫定)* | Obsidian | 需確認是否有外部 Obsidian 筆記與本專案相關 |
| 22 | 舊版程式碼備份 | ⏳ 延後處理 | `Archive/haodai-linebot-legacy/` *(暫定)* | Archive | 目前版本活躍，舊版備份延後整理 |
| 23 | 匯出資料 / 報表 | ⏳ 延後處理 | `Exports/haodai-linebot/` *(暫定)* | Exports | 尚無匯出資料需求，延後處理 |

---

## 目標資料夾索引

| 目標資料夾 | 用途說明 | 涵蓋本表項目 |
|-----------|---------|------------|
| `Projects/haodai-linebot/` | 正式專案主體（程式碼、設定、說明文件） | #1–#11 |
| `Agent-KB/haodai-linebot/docs/` | 代理人知識庫：規劃文件、決策記錄 | #9 |
| `AI-Cache/haodai-linebot/` | AI 回應快取（待實作後確認） | #18 |
| `Sandbox/haodai-linebot-exp/` | 實驗性功能測試區 | #19 |
| `Incubator/haodai-linebot-ideas/` | 孵化中功能構想 | #20 |
| `Obsidian/haodai-linebot/` | Obsidian 筆記相關聯資料 | #21 |
| `Archive/haodai-linebot-legacy/` | 封存舊版本 | #22 |
| `Exports/haodai-linebot/` | 匯出資料與報表 | #23 |
| `Private-Staging/` | 本機私密設定（不進版控） | #14 |

---

## 不搬遷原因彙整

| 項目 | 原因 |
|------|------|
| `tasks.json`、`api_usage.json` | runtime 自動生成，非原始碼，不納入版本控管或搬遷 |
| `.env` | 含機密資訊，依各部署平台獨立設定，不搬 |
| `__pycache__/`、`venv/` | 建置產物或本地環境，各端重建即可 |
| `*.log` | 執行期日誌，不屬於源碼資產；有需要可移至 Archive |

---

## 待判定項目追蹤

以下項目需後續確認後才能定案：

- [ ] **#18 AI-Cache**：確認是否有 Perplexity 或其他 AI 回應快取需求及規格
- [ ] **#19 Sandbox**：確認是否有實驗性分支或 PoC 程式需要保留
- [ ] **#20 Incubator**：確認是否有功能構想文件（例如 Notion 頁面、Markdown 草稿）
- [ ] **#21 Obsidian**：確認是否有 Obsidian vault 中與本專案相關的筆記需要一起搬

---

## 執行備忘

> **本文件僅為對應計畫，不代表已實際搬移任何檔案。**
> 實際搬遷請依 Phase 順序進行，完成後於各項目旁標記執行日期。
