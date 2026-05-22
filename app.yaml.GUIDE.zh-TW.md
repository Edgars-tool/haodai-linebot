> 繁體中文版。原始文件：app.yaml（英文）

# app.yaml 技術解說

## 這個檔案做什麼
`app.yaml` 是 Google App Engine（應用執行環境）的部署設定檔，定義 Python runtime（執行環境）、啟動命令、環境變數與自動擴縮策略。

## 主要區塊說明
1. **`runtime: python39`**
   - 指定服務使用 Python 3.9。
2. **`env: standard`**
   - 使用 App Engine standard environment（標準環境）。
3. **`entrypoint`**
   - 透過 `gunicorn -b :$PORT app:app` 啟動 Flask app。
4. **`env_variables`**
   - 目前只定義 `MONTHLY_API_LIMIT: "500"`。
   - 註解也提醒不要把真實 API key 或 secret（密鑰）直接寫進此檔。
5. **`automatic_scaling`**
   - `min_instances: 1`：至少保留 1 個 instance（執行個體）。
   - `max_instances: 10`：最多擴展到 10 個 instance。
   - `target_cpu_utilization` 與 `target_throughput_utilization` 用來調整自動擴縮觸發條件。

## 常用指令
```bash
gcloud app deploy app.yaml
```

```bash
gcloud app logs tail -s default
```

## 注意事項
- 真實敏感環境變數應使用 Secret Manager（密鑰管理）或部署平台設定介面。
- `min_instances: 1` 能降低冷啟動，但會增加待機成本。
- `entrypoint` 依賴 `app.py` 中的 `app` 物件命名保持不變。
