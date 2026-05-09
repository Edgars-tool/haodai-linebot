> 繁體中文版。原始文件：main.py（英文）

# main.py 技術解說

## 這個檔案做什麼
這是簡化版 entrypoint（入口點）檔案，供某些部署平台直接載入 `app` 物件或在本機以 `python main.py` 啟動服務。

## 主要區塊說明
1. **路徑處理**
   - 把目前檔案所在目錄加入 `sys.path`，確保 `from app import app` 能成功匯入。
2. **匯入 Flask app**
   - 從 `app.py` 匯入已初始化好的 `app` 物件。
3. **直接執行模式**
   - 若以主程式方式啟動，會讀取 `PORT` 環境變數，預設為 `5000`。
   - `debug=False` 表示不以除錯模式執行。

## 常用指令
```bash
python main.py
```

```bash
set PORT=5000 && python main.py
```

## 注意事項
- 真正的業務邏輯都在 `app.py`，此檔案主要是啟動包裝。
- 如果部署平台已直接指定 `app:app`，通常不一定會經過 `main.py`。
