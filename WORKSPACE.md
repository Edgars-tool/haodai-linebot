# 工作區整合說明 (WHO-8)

本文件記錄正式專案的落點整理，對應任務 [WHO-8](https://linear.app/whoasked/issue/WHO-8)。

---

## 目標

將所有正式使用中的 repo 移入統一落點：

```
C:\Users\EdgarsTool\Projects\
```

---

## 專案狀態總覽

| Repo | 狀態 | 落點 |
|------|------|------|
| `haodai-linebot` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\haodai-linebot` |
| `openclaw` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\openclaw` |
| `mcp-handcraft` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\mcp-handcraft` |
| `hot-reload` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\hot-reload` |
| `ollama` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\ollama` |
| `obsidian` | 🔬 設定/文件為主 | `C:\Users\EdgarsTool\Projects\obsidian` |

---

## 整合時程

| 日期 | 里程碑 |
|------|--------|
| 2026-04-12 | 盤點完成，確認各 repo 屬性（正式 / 實驗） |
| 2026-04-14 | 本機所有正式 repo clone 至 `Projects\` 目錄 |
| 2026-04-16 | 確認各 repo 遠端設定（remote URL、分支保護）正確 |
| 2026-04-18 | 移除舊落點的重複副本，更新開發工具路徑設定 |
| 2026-04-20 | 整合完成，`Projects\` 為唯一正式工作目錄 |

---

## 本機設置步驟

```powershell
# 建立 Projects 目錄（若尚未存在）
New-Item -ItemType Directory -Force -Path "C:\Users\EdgarsTool\Projects"

# Clone 各正式 repo（以 haodai-linebot 為例）
cd C:\Users\EdgarsTool\Projects
git clone https://github.com/Edgars-tool/haodai-linebot.git
git clone https://github.com/Edgars-tool/openclaw.git
git clone https://github.com/Edgars-tool/mcp-handcraft.git
git clone https://github.com/Edgars-tool/hot-reload.git
git clone https://github.com/Edgars-tool/ollama.git
git clone https://github.com/Edgars-tool/obsidian.git
```

---

## 說明

- **正式專案**：目前正在維護、有實際使用者或部署的 repo。
- **實驗/早期內容**：開發中或概念驗證性質，尚未進入生產使用。
- `obsidian` 以設定檔與筆記為主，一併納入 `Projects\` 以保持路徑一致。

---

*最後更新：2026-04-12*
