# 📁 S3-03 正式 Repo 搬移記錄

## 目標

把已確認屬於正式專案的 repo 集中到 `C:\Users\EdgarsTool\Projects`，讓正式工作區有固定位置。

---

## 正式 Repo 清單

| Repo 名稱 | 說明 | 搬移狀態 |
|-----------|------|----------|
| `haodai-linebot` | LINE Bot 機器人（浩呆）- 正式生產專案 | ✅ 已搬移 |

---

## 目標位置

```
C:\Users\EdgarsTool\Projects\
└── haodai-linebot\      ← 正式 LINE Bot 專案
```

---

## 搬移步驟

### 1. 確認目標位置存在

```powershell
# 若目錄不存在，先建立
New-Item -ItemType Directory -Path "C:\Users\EdgarsTool\Projects" -Force
```

### 2. 搬移 haodai-linebot

```powershell
# 方式 A：直接移動資料夾（若已有本機 clone）
Move-Item "C:\Users\EdgarsTool\<舊路徑>\haodai-linebot" "C:\Users\EdgarsTool\Projects\haodai-linebot"

# 方式 B：重新 clone 到正確位置
cd C:\Users\EdgarsTool\Projects
git clone https://github.com/Edgars-tool/haodai-linebot.git
```

### 3. 搬移後驗證

```powershell
cd C:\Users\EdgarsTool\Projects\haodai-linebot

# 確認 Git repo 狀態正常
git status
git remote -v
git log --oneline -5
```

預期輸出：
- `git status`：`nothing to commit, working tree clean`
- `git remote -v`：指向 `https://github.com/Edgars-tool/haodai-linebot.git`

---

## 搬移後路徑確認

| 項目 | 路徑 |
|------|------|
| 本機工作目錄 | `C:\Users\EdgarsTool\Projects\haodai-linebot` |
| GitHub 遠端 | `https://github.com/Edgars-tool/haodai-linebot` |
| 部署目標 | Google Cloud Run（`asia-east1`） |

---

## 注意事項

- 若使用 **VS Code**，搬移後需重新開啟資料夾（`File → Open Folder`），並選擇新路徑
- 若使用 **GitHub Desktop**，需在 `File → Add Local Repository` 重新指向新路徑
- 若有 `.env` 檔案（本機環境變數），搬移後需確認仍在新位置
- `tasks.json` 和 `api_usage.json` 為執行時生成的資料檔，搬移後會重新建立

## 不包含在此次搬移的內容

- 實驗性或測試用 repo
- 知識庫內容
- 歷史殘留檔案

---

## 完成標準

- [x] `haodai-linebot` 已集中到 `C:\Users\EdgarsTool\Projects`
- [x] 搬移後可正常開啟與使用（Git 狀態正常）
- [x] DEPLOYMENT_GUIDE.md 已更新，反映正確的本機路徑
- [ ] 若有依賴舊路徑的工具或捷徑，另行記錄並修正

---

*記錄時間：2026-04-12*
*對應議題：WHO-19 / S3-03*
