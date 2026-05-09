> 繁體中文版。原始文件：WORKSPACE.md（英文）

# 工作區整合說明（WHO-8）

本文件整理正式專案的工作路徑與整合狀態，對應任務 [WHO-8](https://linear.app/whoasked/issue/WHO-8)。

## 目標
將正式使用中的 repository（倉庫）統一放到：

```powershell
C:\Users\EdgarsTool\Projects\
```

## 專案狀態總覽
| Repo | 狀態 | 路徑 |
|------|------|------|
| `haodai-linebot` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\haodai-linebot` |
| `openclaw` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\openclaw` |
| `mcp-handcraft` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\mcp-handcraft` |
| `hot-reload` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\hot-reload` |
| `ollama` | ✅ 正式專案 | `C:\Users\EdgarsTool\Projects\ollama` |
| `obsidian` | 🔬 以設定 / 文件為主 | `C:\Users\EdgarsTool\Projects\obsidian` |

## 整合時程
| 日期 | 里程碑 |
|------|--------|
| 2026-04-12 | 完成盤點，確認各 repo 屬性 |
| 2026-04-14 | 正式 repo 全數 clone 到 `Projects\` |
| 2026-04-16 | 確認 remote（遠端）設定與分支策略 |
| 2026-04-18 | 清理舊路徑的重複副本並更新工具設定 |
| 2026-04-20 | 整合完成，`Projects\` 成為唯一正式工作區 |

## 本機設置步驟
```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\EdgarsTool\Projects"

cd C:\Users\EdgarsTool\Projects
git clone https://github.com/Edgars-tool/haodai-linebot.git
git clone https://github.com/Edgars-tool/openclaw.git
git clone https://github.com/Edgars-tool/mcp-handcraft.git
git clone https://github.com/Edgars-tool/hot-reload.git
git clone https://github.com/Edgars-tool/ollama.git
git clone https://github.com/Edgars-tool/obsidian.git
```

## 說明
- **正式專案**：目前持續維護、已部署或已有實際使用者的 repo。
- **實驗 / 早期內容**：仍在驗證或尚未進入正式使用。
- `obsidian` 以設定與筆記為主，但仍納入 `Projects\` 以維持工作路徑一致。
