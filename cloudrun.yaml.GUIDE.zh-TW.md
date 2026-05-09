> 繁體中文版。原始文件：cloudrun.yaml（英文）

# cloudrun.yaml 技術解說

## 這個檔案做什麼
這是 Google Cloud Run 的 service manifest（服務清單），用來描述服務名稱、容器映像、埠號與 autoscaling（自動擴縮）設定。

## 主要區塊說明
1. **`apiVersion` / `kind`**
   - 指定這是一個 Knative `Service` 定義。
2. **`metadata`**
   - `name: haodai-linebot` 代表部署後的服務名稱。
3. **`spec.template.metadata.annotations`**
   - `maxScale: "10"`：最多可擴到 10 個 instance。
   - `minScale: "1"`：至少保留 1 個 instance，降低冷啟動影響。
4. **`containers`**
   - `image`：容器映像位置，需要替換為實際 GCP project。
   - `containerPort: 5000`：對應 Flask / gunicorn 監聽的埠號。
5. **`env`**
   - 只設定 `PORT=5000`。
   - 其他敏感環境變數預期由部署指令或 Cloud Run 介面注入。

## 常用指令
```bash
gcloud run services replace cloudrun.yaml --region asia-east1
```

```bash
gcloud run deploy haodai-linebot --source . --region asia-east1 --allow-unauthenticated
```

## 注意事項
- `image: gcr.io/YOUR-PROJECT-ID/haodai-linebot` 需要改成實際 project ID。
- 註解已明示：真正的 secret（密鑰）不應直接寫在 YAML 中。
- `minScale: 1` 會增加待機成本，但能減少冷啟動。
