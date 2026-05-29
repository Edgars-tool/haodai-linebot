# 驗票清單：Workspace Rebuilt 成果驗收

> **用途**：這是「Workspace rebuilt」專案的唯一驗收入口。Edgar 照此清單逐項確認，即可判定重建工作是否真正完成。
>
> **對應 Linear Issue**：[WHO-88](https://linear.app/edgarstool/issue/WHO-88)

---

## 使用方式

1. 由上而下逐區檢查，每項通過打勾。
2. 需要跑指令的步驟，直接複製貼上到 PowerShell。
3. 有疑義時，點進「相關文件」或「相關 Issue」查看原始記錄。
4. 全部打勾 → 驗收通過；任何一項未過 → 記錄問題後回報。

---

## 一、檔案系統位置確認

> 確認新的工作區結構已建立、目錄存在且可進入。
> 相關 Issue：[WHO-6](https://linear.app/edgarstool/issue/WHO-6)、[WHO-11](https://linear.app/edgarstool/issue/WHO-11)、[WHO-12](https://linear.app/edgarstool/issue/WHO-12)、[WHO-13](https://linear.app/edgarstool/issue/WHO-13)

### C 槽（工作區）

```powershell
# 確認目錄存在
Test-Path "C:\Users\EdgarsTool\Projects"
Test-Path "C:\Users\EdgarsTool\Sandbox"
Test-Path "C:\Users\EdgarsTool\Incubator"
Test-Path "C:\Users\EdgarsTool\Worktrees"
```

- [ ] `C:\Users\EdgarsTool\Projects\` 存在
- [ ] `C:\Users\EdgarsTool\Sandbox\` 存在
- [ ] `C:\Users\EdgarsTool\Incubator\` 存在
- [ ] `C:\Users\EdgarsTool\Worktrees\` 存在

### D 槽（資料區）

```powershell
Test-Path "D:\Agent-KB"
Test-Path "D:\Edgar'sObsidianVault"
Test-Path "D:\Archive"
Test-Path "D:\Exports"
Test-Path "D:\Private-Staging"
Test-Path "D:\AI-Cache"
```

- [ ] `D:\Agent-KB\` 存在
- [ ] `D:\Edgar'sObsidianVault\` 存在
- [ ] `D:\Archive\` 存在
- [ ] `D:\Exports\` 存在
- [ ] `D:\Private-Staging\` 存在
- [ ] `D:\AI-Cache\` 存在

---

## 二、資料夾使用邊界已定義

> 確認每個頂層資料夾的用途規則已寫下，放檔案時能快速判斷位置。
> 相關 Issue：[WHO-7](https://linear.app/edgarstool/issue/WHO-7)、[WHO-14](https://linear.app/edgarstool/issue/WHO-14)、[WHO-15](https://linear.app/edgarstool/issue/WHO-15)、[WHO-16](https://linear.app/edgarstool/issue/WHO-16)、[WHO-9](https://linear.app/edgarstool/issue/WHO-9)
> 相關文件：[WORKSPACE-ZONE-BOUNDARY.md](./docs/WORKSPACE-ZONE-BOUNDARY.md)

| 資料夾 | 用途 | 驗證方式 |
|--------|------|---------|
| Projects | 正式專案 repo | 裡面有 haodai-linebot、openclaw 等 |
| Sandbox | 測試與可丟棄內容 | 沒有正式專案混入 |
| Incubator | 早期專案想法與草稿 | 與 Projects 區隔清楚 |
| Agent-KB | 代理人知識庫（SOP、規格） | 有 CORE / ADAPTERS / RECENT 結構 |
| Obsidian | 個人反思、筆記 | 不與 Agent-KB 混用 |
| Archive | 封存不再使用的內容 | 無活躍專案 |
| Exports | 匯出資料與報表 | — |
| Private-Staging | 本機私密設定 | 不進版控 |

- [ ] 使用規則文件存在且可讀取（`docs/WORKSPACE-ZONE-BOUNDARY.md`）
- [ ] 能在 30 秒內判定「一份新檔案該放哪個資料夾」

---

## 三、正式 Repo 清點與落點

> 確認正式 repo 都已移入 `Projects\`，遠端設定正確。
> 相關 Issue：[WHO-8](https://linear.app/edgarstool/issue/WHO-8)、[WHO-17](https://linear.app/edgarstool/issue/WHO-17)、[WHO-18](https://linear.app/edgarstool/issue/WHO-18)、[WHO-19](https://linear.app/edgarstool/issue/WHO-19)、[WHO-71](https://linear.app/edgarstool/issue/WHO-71)
> 相關文件：[WORKSPACE.md](./WORKSPACE.md)

```powershell
# 逐一確認各 repo 的 remote 和狀態
$repos = @("haodai-linebot","openclaw","mcp-handcraft","hot-reload","ollama","obsidian")
foreach ($r in $repos) {
    Write-Host "=== $r ===" -ForegroundColor Cyan
    cd "C:\Users\EdgarsTool\Projects\$r"
    git remote -v
    git status --short
    cd ..
}
```

| Repo | 預期落點 | 檢查 |
|------|---------|------|
| haodai-linebot | `Projects\haodai-linebot` | - [ ] 存在且 remote 為 `Edgars-tool/haodai-linebot` |
| openclaw | `Projects\openclaw` | - [ ] 存在且 remote 正確 |
| mcp-handcraft | `Projects\mcp-handcraft` | - [ ] 存在且 remote 正確 |
| hot-reload | `Projects\hot-reload` | - [ ] 存在且 remote 正確 |
| ollama | `Projects\ollama` | - [ ] 存在且 remote 正確 |
| obsidian | `Projects\obsidian` | - [ ] 存在且 remote 正確 |

- [ ] 每個 repo 的 `git status` 為乾淨狀態（working tree clean）
- [ ] 沒有正式 repo 殘留在舊工作區位置

---

## 四、haodai-linebot 根目錄檔案確認

> 確認核心專案檔案完整。
> 相關 Issue：[WHO-43](https://linear.app/edgarstool/issue/WHO-43)

```powershell
cd "C:\Users\EdgarsTool\Projects\haodai-linebot"
@("app.py","main.py","requirements.txt",".env.example",".gitignore","cloudrun.yaml","app.yaml","Procfile","README.md","DEPLOYMENT_GUIDE.md","RECONSTRUCTION_VERIFICATION_CHECKLIST.md","ROLLBACK_GUIDE.md","DAILY_CHECKLIST.md","WORKSPACE.md") | ForEach-Object {
    $exists = Test-Path $_
    Write-Host "$_ : $exists"
}
```

- [ ] `app.py` — 主應用程式
- [ ] `main.py` — Flask 入口點
- [ ] `requirements.txt` — Python 依賴清單
- [ ] `.env.example` — 環境變數範本
- [ ] `.gitignore` — 包含 `.env`、`tasks.json`、`api_usage.json`
- [ ] `cloudrun.yaml` — Cloud Run 部署設定
- [ ] `app.yaml` — App Engine 設定
- [ ] `Procfile` — Heroku 設定
- [ ] `README.md` — 功能總覽與本地啟動說明
- [ ] `DEPLOYMENT_GUIDE.md` — 部署操作手冊
- [ ] `RECONSTRUCTION_VERIFICATION_CHECKLIST.md` — 重建驗證清單
- [ ] `ROLLBACK_GUIDE.md` — Rollback 與中斷回復方案
- [ ] `DAILY_CHECKLIST.md` — 每日進場檢查順序

---

## 五、Git 與版本控制驗證

> 確認 repo 狀態健康、分支與遠端設定正確。

```powershell
cd "C:\Users\EdgarsTool\Projects\haodai-linebot"
git remote -v
git status
git log --oneline -5
git fetch origin main
git rev-list --left-right --count origin/main...main
```

- [ ] `git remote -v` 顯示 `Edgars-tool/haodai-linebot`
- [ ] `git status` 顯示 `working tree clean`
- [ ] `git log --oneline -5` 可正常顯示最近提交
- [ ] 本地 `main` 分支與 `origin/main` 無落後
- [ ] `.gitignore` 有效：`.env`、`tasks.json` 未被追蹤

---

## 六、應用程式啟動與端點驗證

> 確認 bot 可正常啟動、各 API 端點可回應。

```powershell
cd "C:\Users\EdgarsTool\Projects\haodai-linebot"

# 語法檢查
python -m py_compile app.py
python -m py_compile main.py

# 安裝依賴
python -m pip install -r requirements.txt

# 啟動（另開 terminal 或背景執行）
python app.py
```

- [ ] `py_compile app.py` 無錯誤
- [ ] `py_compile main.py` 無錯誤
- [ ] `pip install -r requirements.txt` 成功
- [ ] `python app.py` 啟動後 `http://localhost:5000` 有回應

### 端點檢查

| 端點 | 方法 | 預期 | 檢查 |
|------|------|------|------|
| `/` | GET | 顯示機器人狀態頁 | - [ ] 可正常存取 |
| `/callback` | POST | LINE Webhook 入口（回 200 或 400） | - [ ] 端點存在 |
| `/cron-daily-report` | GET | 每日報告觸發 | - [ ] 可正常回應 |
| `/reminders-check` | GET | 提醒檢查（Make.com 用） | - [ ] 可正常回應 |

---

## 七、LINE / Cloud Run 線上驗證

> 確認部署環境與 LINE 整合正常運作。
> 相關 Issue：[WHO-34](https://linear.app/edgarstool/issue/WHO-34)

### Cloud Run

```bash
# 確認服務狀態
gcloud run services describe haodai-linebot --region asia-east1 --format="value(status.url)"
```

- [ ] Cloud Run 服務狀態為「正在執行」
- [ ] 服務 URL 可正常存取（GET `/` 回應正常）

### LINE Developers Console

- [ ] Webhook URL 已設為 `https://<部署URL>/callback`
- [ ] 點擊「Verify」測試通過
- [ ] 「Use webhook」已啟用

### LINE 冒煙測試

在 LINE 對話中依序傳送以下訊息：

| # | 傳送內容 | 預期回應 | 檢查 |
|---|---------|---------|------|
| 1 | `我的ID` | 顯示有效的 LINE User ID | - [ ] 通過 |
| 2 | `待辦 驗收測試` | 確認新增成功 | - [ ] 通過 |
| 3 | `今天待辦` | 清單包含剛才新增的項目 | - [ ] 通過 |
| 4 | `完成 1` | 確認完成成功 | - [ ] 通過 |
| 5 | `額度` | 顯示本月 AI 使用量 | - [ ] 通過 |
| 6 | `小結` | 今天與明天任務摘要 | - [ ] 通過 |
| 7 | `誰還沒做` | 各擁有者未完成任務統計 | - [ ] 通過 |

---

## 八、舊 Workspace 搬遷驗證

> 確認舊位置到新位置的搬遷對應已記錄且可追溯。
> 相關 Issue：[WHO-39](https://linear.app/edgarstool/issue/WHO-39)、[WHO-40](https://linear.app/edgarstool/issue/WHO-40)
> 相關文件：[S7-02 搬遷對應表](./docs/S7-02-migration-mapping.md)、[S7-03 分批搬遷執行紀錄](./docs/S7-03-migration-execution-log.md)

- [ ] 搬遷對應表（`docs/S7-02-migration-mapping.md`）存在且 Phase 1–4 對應完整
- [ ] 分批搬遷執行紀錄（`docs/S7-03-migration-execution-log.md`）存在且 Batch 1–3 有驗證清單
- [ ] 不搬遷項目（`tasks.json`、`api_usage.json`、`.env`、`__pycache__/`）原因已記錄
- [ ] 待判定項目（AI-Cache、Sandbox 實驗分支等）已標記追蹤

---

## 九、營運文件與流程驗證

> 確認日常操作所需的文件與流程都已到位。
> 相關 Issue：[WHO-72](https://linear.app/edgarstool/issue/WHO-72)、[WHO-58](https://linear.app/edgarstool/issue/WHO-58)、[WHO-25](https://linear.app/edgarstool/issue/WHO-25)、[WHO-50](https://linear.app/edgarstool/issue/WHO-50)

### Agent Bootstrap

- [ ] 統一 bootstrap 定義存在（`D:\Agent-KB\ADAPTERS\generic-bootstrap.txt`）
- [ ] Bootstrap 包含：核心定位、專案地形、決策規則、任務輸出格式、禁止行為

### 每日進場檢查

- [ ] `DAILY_CHECKLIST.md` 存在且包含 4 步快速流程
- [ ] 整個流程可在 5 分鐘內完成

### 提醒直送流程

- [ ] OpenClaw × Mem0 × LINE 提醒流程已整理（WHO-58）
- [ ] Mem0 身份收斂為 `user_id = edgar`
- [ ] `chat-reminder` 腳本支援 `target-account` 直送

### Agent 技能載入

- [ ] Agent 技能搜尋路徑已確認（WHO-50）
- [ ] 能分辨「技能檔存在」與「agent 可發現並使用」的差異

---

## 十、Rollback 與維護基線

> 確認出問題時有回退方案、維護流程已建立。
> 相關 Issue：[WHO-47](https://linear.app/edgarstool/issue/WHO-47)、[WHO-33](https://linear.app/edgarstool/issue/WHO-33)、[WHO-35](https://linear.app/edgarstool/issue/WHO-35)
> 相關文件：[ROLLBACK_GUIDE.md](./ROLLBACK_GUIDE.md)

- [ ] `ROLLBACK_GUIDE.md` 存在且包含：
  - [ ] 高風險操作清單（含風險等級）
  - [ ] 停止操作的條件
  - [ ] 各操作的回退步驟（Cloud Run、環境變數、LINE Token、tasks.json、Notion、Make.com）
  - [ ] 備份與保留原狀說明
  - [ ] 中斷後重新接續步驟
  - [ ] 操作前確認檢查點
- [ ] 知道出問題時先看 `ROLLBACK_GUIDE.md` 的哪一節

---

## 驗收紀錄

| 驗收日期 | 執行者 | 通過區數 / 10 | 未通過項目 | 備註 |
|---------|--------|-------------|----------|------|
|         |        |             |          |      |

---

## 相關文件索引

| 文件 | 位置 | 用途 |
|------|------|------|
| [README.md](./README.md) | repo 根目錄 | 功能總覽、指令清單、本地啟動 |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | repo 根目錄 | 部署操作手冊 |
| [RECONSTRUCTION_VERIFICATION_CHECKLIST.md](./RECONSTRUCTION_VERIFICATION_CHECKLIST.md) | repo 根目錄 | 重建後逐條驗證 |
| [ROLLBACK_GUIDE.md](./ROLLBACK_GUIDE.md) | repo 根目錄 | Rollback 與中斷回復 |
| [DAILY_CHECKLIST.md](./DAILY_CHECKLIST.md) | repo 根目錄 | 每日進場檢查 |
| [WORKSPACE.md](./WORKSPACE.md) | repo 根目錄 | 專案落點總覽 |
| [S7-02 搬遷對應表](./docs/S7-02-migration-mapping.md) | docs/ | 舊→新位置對應 |
| [S7-03 搬遷執行紀錄](./docs/S7-03-migration-execution-log.md) | docs/ | 分批搬遷過程記錄 |
| [WORKSPACE-ZONE-BOUNDARY.md](./docs/WORKSPACE-ZONE-BOUNDARY.md) | docs/ | 七區邊界與協作規則 |

---

## 相關 Linear Issue 總覽

| 區段 | 相關 Issue |
|------|-----------|
| 頂層結構 | [WHO-6](https://linear.app/edgarstool/issue/WHO-6)、[WHO-11](https://linear.app/edgarstool/issue/WHO-11)、[WHO-12](https://linear.app/edgarstool/issue/WHO-12)、[WHO-13](https://linear.app/edgarstool/issue/WHO-13) |
| 使用規則 | [WHO-7](https://linear.app/edgarstool/issue/WHO-7)、[WHO-14](https://linear.app/edgarstool/issue/WHO-14)、[WHO-15](https://linear.app/edgarstool/issue/WHO-15)、[WHO-16](https://linear.app/edgarstool/issue/WHO-16)、[WHO-9](https://linear.app/edgarstool/issue/WHO-9) |
| Repo 整理 | [WHO-8](https://linear.app/edgarstool/issue/WHO-8)、[WHO-17](https://linear.app/edgarstool/issue/WHO-17)、[WHO-18](https://linear.app/edgarstool/issue/WHO-18)、[WHO-19](https://linear.app/edgarstool/issue/WHO-19)、[WHO-71](https://linear.app/edgarstool/issue/WHO-71) |
| 舊 Workspace 搬遷 | [WHO-39](https://linear.app/edgarstool/issue/WHO-39)、[WHO-40](https://linear.app/edgarstool/issue/WHO-40)、[WHO-50](https://linear.app/edgarstool/issue/WHO-50) |
| 營運流程 | [WHO-72](https://linear.app/edgarstool/issue/WHO-72)、[WHO-58](https://linear.app/edgarstool/issue/WHO-58)、[WHO-25](https://linear.app/edgarstool/issue/WHO-25) |
| 驗證與維護 | [WHO-43](https://linear.app/edgarstool/issue/WHO-43)、[WHO-47](https://linear.app/edgarstool/issue/WHO-47)、[WHO-33](https://linear.app/edgarstool/issue/WHO-33)、[WHO-34](https://linear.app/edgarstool/issue/WHO-34)、[WHO-35](https://linear.app/edgarstool/issue/WHO-35) |

---

*最後更新：2026-05-29 | 對應 Linear Issue: [WHO-88](https://linear.app/edgarstool/issue/WHO-88)*
