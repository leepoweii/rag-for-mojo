# 夢酒館 RAG 品牌大使 - Web App 展示版本

此版本全由 Claude Code 開發。

將原本的 Jupyter Notebook 作業重構成 Web App 的展示版本。使用 Flask + 前端設計，部署到 Modal 讓朋友可以直接試用。

## 功能特色

- 🍸 **智能對話**: 使用 RAG 技術提供準確的品牌介紹和調酒推薦
- 🎨 **精美設計**: 融合金門文化與酒吧氛圍的獨特視覺設計
- 💬 **即時互動**: 流暢的聊天介面，支援打字機效果
- 🔍 **語意拆解**: 自動拆解複合問句，提升檢索準確度
- 📱 **響應式設計**: 支援桌面和行動裝置

## 技術架構

### 後端
- **框架**: Flask 3.0+
- **LLM**: OpenAI GPT-4.1 Nano
- **向量檢索**: FAISS + E5 Embedding
- **RAG**: LangChain

### 前端
- **設計風格**: 融合金門紅磚建築、酒吧氛圍
- **色調**: 深棕、琥珀、金色（木造古厝裝潢）
- **字型**: Noto Serif TC (中文) + Cinzel (英文標題) + Cormorant Garamond (英文內文)
- **效果**: 流動漸變背景、顆粒紋理
- **響應式**: 完美支援桌面和行動裝置

## 快速開始

### 1. 環境需求

- Python >= 3.10
- uv (Python 套件管理工具)

### 2. 安裝 uv

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 3. 安裝依賴

```bash
cd app
uv sync
```

### 4. 設定環境變數

```bash
# 複製環境變數範例檔案
cp .env.example .env

# 編輯 .env 檔案，填入你的 OpenAI API Key
# OPENAI_API_KEY=your_openai_api_key_here
```

### 5. 本地運行

```bash
# 方法 1: 使用 port 8000（推薦 - macOS 用戶）
PORT=8000 uv run python app.py

# 方法 2: 使用預設 port 5000
uv run python app.py

# 方法 3: 啟動虛擬環境後運行
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate  # Windows
PORT=8000 python app.py
```

**訪問應用程式:**
- Port 8000: `http://localhost:8000`
- Port 5000: `http://localhost:5000`

⚠️ **macOS 用戶注意**: 系統的 AirPlay Receiver 預設佔用 port 5000，建議使用 port 8000，或前往「系統設定」→「一般」→「隔空播放接收器」關閉該功能。

## 🚢 部署到 Modal

本專案使用 Modal 進行 serverless 部署。

### 為何選擇 Modal？

- **成本優勢**: PyTorch/CUDA 工作負載成本更低
- **自動擴展**: 流量高峰自動擴展，空閒時縮減至零
- **按使用計費**: 只需為實際使用的計算時間付費
- **ML 最佳化**: 專為機器學習工作負載設計

### 部署步驟

📖 **詳細教學**: [MODAL_DEPLOYMENT.md](../MODAL_DEPLOYMENT.md)

**快速部署：**

```bash
# 1. 安裝並認證 Modal CLI
pip install modal
modal setup

# 2. 建立 Secret
modal secret create portfolio-rag-mojo \
  OPENAI_API_KEY=your-key \
  OPENAI_MODEL=gpt-4o-mini \
  EMBEDDING_MODEL=intfloat/multilingual-e5-small

# 3. 上傳 FAISS 資料庫（從專案根目錄）
cd ..
modal run upload_faiss_to_modal.py

# 4. 部署應用
modal deploy modal_app.py
```

### 更新部署

**程式碼更新：**
```bash
modal deploy modal_app.py
```

**FAISS 資料庫更新：**
```bash
modal run upload_faiss_to_modal.py
modal deploy modal_app.py
```

### 監控

```bash
# 即時日誌
modal app logs mojo-rag-brand-ambassador

# Dashboard
# https://modal.com/apps
```

### 成本

- 低流量：~$1-2/月
- 中流量：~$10-15/月
- 含 $10/月免費額度

## 專案結構

```
app/
├── app.py                  # Flask 主程式
├── pyproject.toml          # uv 專案配置
├── .env.example            # 環境變數範例
├── .gitignore              # Git 忽略檔案
├── README.md               # 本說明文件
├── faiss_db/               # FAISS 向量資料庫
├── templates/
│   └── index.html          # 主頁面模板
└── static/
    ├── css/
    │   └── style.css       # 樣式表
    └── js/
        └── app.js          # 前端互動腳本
```

## 環境變數說明

| 變數名稱 | 說明 | 預設值 |
|---------|------|-------|
| `OPENAI_API_KEY` | OpenAI API 金鑰 | 必填 |
| `OPENAI_MODEL` | 使用的 OpenAI 模型 | `gpt-4.1-nano` |
| `EMBEDDING_MODEL` | Embedding 模型 | `intfloat/multilingual-e5-small` |
| `SECRET_KEY` | Flask 密鑰 | 自動生成 |
| `PORT` | 服務埠號 | `5000` (本機開發用) |

## 使用說明

1. 開啟應用程式後，您會看到歡迎訊息
2. 在輸入框輸入您的問題，例如：
   - "請推薦一杯適合夏天的清爽調酒"
   - "夢酒館的品牌理念是什麼？"
   - "有哪些國際媒體報導過夢酒館？"
3. 按 Enter 或點擊發送按鈕
4. 品牌大使會以專業且溫暖的語氣回答您

## 技術細節參考

如果你想了解實作細節：

**主要程式碼在 `app.py`:**
- `separate_queries()`: 語意拆解邏輯
- `retrieve_answers()`: 向量檢索流程
- `integrate_answers()`: 答案整合機制

**前端樣式在 `static/css/style.css`:**
- 所有顏色變數定義在 `:root` 區塊
- 融合金門紅磚建築與酒吧氛圍設計

**向量資料庫 `faiss_db/`:**
- 使用 E5 Multilingual embedding
- 基於夢酒館品牌資料建立

## 關於這個專案

這是我的學校作業展示版本，透過 Claude Code 開發。歡迎參考程式碼，但請注意這是為了作業展示而非生產使用。

**線上試用**: [https://rag-schoolwork.pwlee.xyz](https://rag-schoolwork.pwlee.xyz)

---

夢酒館 MOJO | 金門, Taiwan
