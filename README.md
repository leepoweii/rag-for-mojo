# 夢酒館 RAG 品牌大使

> 使用 RAG 技術打造的智能品牌介紹與調酒推薦系統

🔗 **線上示範**: [https://rag-schoolwork.pwlee.xyz](https://rag-schoolwork.pwlee.xyz)

## 📋 專案背景與演進

### 起源：學校作業與內部需求
我在金門開了一間酒吧叫做夢酒館，這原本是學校的 RAG 作業。當時剛好在申請金門的地方創生補助案，需要重複整理公司資訊、品牌故事、調酒介紹等內容撰寫不同方向的計劃書，因此想到可以建立一個 RAG 知識庫，作為**內部資料查詢助手**，未來可以快速提取資料並整合成各種文件。

### 專案定位演變
為了作業示範與對外展示，考慮到測試 demo 的使用者並非內部人員，因此將系統定位調整為「對外的品牌介紹人員」（品牌大使），這樣分享給朋友體驗時會比較有趣，也更貼近實際應用場景。

**未來發展方向**：本專案作為前置探索，已驗證 RAG 技術的可行性。未來可以調整回最初的設定，發展為內部使用的資料查詢助手，協助快速整合各類文件與計劃書。

### 專案演進：從 Notebook 到 Web App
- **第一階段**（作業繳交）：使用 Jupyter Notebook + Gradio 快速驗證概念
- **第二階段**（專案部署）：為了方便部署和對外展示，重新組織專案結構，並透過 Claude Code 開發 Flask Web App，部署到 Zeabur

目前的 monorepo 結構保留了原始的研究版本（`/notebook`），同時新增展示版本的 Web App（`/app`）

### 知識庫內容
1. 品牌介紹與創立故事
2. 調酒酒單與風味描述
3. 國際媒體報導（AsiaOne、SCMP、Straits Times 等）

## 🏗️ Monorepo 結構

本專案採用 monorepo 架構，包含兩個獨立的子專案：

```
rag-for-mojo/
├── notebook/              # 📓 Jupyter Notebook 原始作業版本
│   ├── 酒吧RAG品牌大使.ipynb
│   ├── faiss_db/
│   ├── pyproject.toml
│   ├── .env.example
│   └── README.md
│
├── app/                   # 🚀 Flask Web App（展示版本）
│   ├── app.py
│   ├── templates/
│   ├── static/
│   ├── faiss_db/
│   ├── pyproject.toml
│   ├── .env.example
│   └── README.md
│
├── faiss_db/             # 📊 共享的向量資料庫（原始版本）
└── README.md             # 📖 本說明文件
```

## 🎯 兩個版本的差異

### 📓 Notebook 版本 (`/notebook`)

**用途**: 原始作業版本

- Jupyter Notebook 互動式開發環境
- 包含完整的作業備註說明
- 使用 Gradio 快速打造簡易 UI
- 適合學習和理解 RAG 系統原理

[查看詳細說明 →](./notebook/README.md)

### 🚀 App 版本 (`/app`)

**用途**: 對外展示，方便使用者試用

- Flask Web App
- 清晰易懂的前端設計
- 打字機效果、流暢動畫、響應式設計

[查看詳細說明 →](./app/README.md)

## 🚀 快速開始

### 1. 選擇你需要的版本

#### 方案 A：使用 Notebook 版本（研究/學習）

```bash
# 進入 notebook 目錄
cd notebook

# 安裝依賴
uv sync

# 設置環境變數
cp .env.example .env
# 編輯 .env 添加你的 OpenAI API Key

# 啟動 Jupyter Notebook
uv run jupyter notebook
```

#### 方案 B：使用 App 版本（部署/生產）

```bash
# 進入 app 目錄
cd app

# 安裝依賴
uv sync

# 設置環境變數
cp .env.example .env
# 編輯 .env 添加你的 OpenAI API Key

# 本地運行
uv run python app.py
```

### 2. 安裝 uv（如果還沒安裝）

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## 💡 核心技術

### RAG 系統架構

1. **語意拆解**: 使用 LLM 將複合式問題拆解成多個子問題
2. **個別檢索**: 針對每個子問題分別從知識庫檢索
3. **整合回答**: 根據原始問句整合所有檢索結果

### 技術棧

- **LLM**: OpenAI GPT-4.1 Nano
- **向量資料庫**: FAISS
- **Embedding**: E5 Multilingual (intfloat/multilingual-e5-small)
- **框架**: LangChain
- **UI (Notebook)**: Gradio
- **UI (App)**: Flask + 原生 HTML/CSS/JS

### 自訂 E5 Embedding 類別

```python
class CustomE5Embedding(HuggingFaceEmbeddings):
    def embed_documents(self, texts):
        texts = [f"passage: {t}" for t in texts]
        return super().embed_documents(texts)

    def embed_query(self, text):
        return super().embed_query(f"query: {text}")
```

## 🎨 設計特色（App 版本）

- **美學理念**: 融合金門紅磚建築、酒吧氛圍
- **色調**: 深棕、琥珀、金色（木造古厝裝潢）
- **字型**: Noto Serif TC (中文) + Cinzel (英文標題) + Cormorant Garamond (英文內文)
- **效果**: 流動漸變背景、顆粒紋理
- **響應式**: 完美支援桌面和行動裝置

## 💬 互動設計

### Thinking Blocks - 思考過程可視化

本系統僅展示第一次的思考設計：

- **首次問題**：完整展示 RAG 思考過程（查詢拆解 → 向量檢索 → 答案整合）
- **後續追問**：直接顯示答案，保持介面簡潔

**設計考量：**
1. **Demo 展示需求**：首次問題已足夠展示技術原理
2. **使用者體驗**：避免多次對話時過多視覺干擾
3. **實用性**：追問通常語意較單純，不需重複展示複雜拆解過程

**Thinking Blocks 包含三個階段：**
- 🧩 **Stage 1: Query Decomposition** - 顯示原始問題與拆解後的子問題
- 🔍 **Stage 2: Individual Retrieval** - 顯示每個子問題檢索到的知識庫內容
- 🎯 **Stage 3: Final Integration** - 顯示整合方法說明

所有階段皆可展開/收合。

## 🔧 已解決的技術挑戰

### ✅ 複合式問句問題
**問題**: RAG 系統一次只能處理單一問題，對於包含多個子句的複合式問句，無法精確理解並提供完整答案。

**解法**: 利用 LLM 先將複合式問句拆解成多個子問題，分別進行檢索，最後再整合所有答案。

## 目前的限制與未來改進方向

### 🔄 內容組合錯誤

**問題描述**:
由於 RAG 系統將內容切割成 chunks 進行向量檢索，在檢索過程中，偶爾會出現內容組合錯誤的情況。例如，詢問 A 調酒時可能混入 B 調酒的描述片段，導致回答內容不一致。

**未來研究方向**:

本專案識別出以下可能的改進方向，供未來研究探索：

1. **結構化資料綁定方法**
   將向量化 chunks 與結構化 metadata（如內容 ID、分類標籤）綁定，以維持語意檢索的靈活性同時保留資料完整性。

2. **檢索後意圖過濾機制**
   在檢索之後，引入輕量級分類器或小型 LLM，對檢索結果進行意圖判斷與過濾，可能有助於提升結果的一致性。

**現狀說明**: 因本專案為學校作業性質，上述方向僅為初步構想，尚未進行嚴格的實驗驗證。未來若應用於生產環境，建議針對具體使用場景進行深入研究與測試。

### 💰 LLM 多次調用成本考量

**問題描述**:
目前系統設計中，LLM 被多次用於不同處理階段：
1. **查詢拆解階段**: 使用 LLM 將複合問句分解為子問題
2. **答案整合階段**: 使用 LLM 整合檢索結果並生成最終回答

雖然使用的是小模型（GPT-4.1 Nano），單次調用速度不慢，但多次調用會產生累積的成本負擔。對於高頻使用場景，這可能成為營運上的限制。

**現狀說明**: 本專案為作業性質，優先展示 RAG 技術實現。目前尚未研究在不犧牲語意理解品質的前提下，有效降低 LLM 調用次數的方法。此為已知限制，未來需根據實際使用量和預算進行權衡取捨。

## 📦 環境需求

- Python >= 3.10
- uv (推薦使用最新版本)
- OpenAI API Key

## 🚢 部署指南

### 部署 App 版本到 Zeabur

1. 將 `/app` 資料夾推送到 GitHub
2. 在 Zeabur 連接該 repository
3. 設定環境變數（OPENAI_API_KEY 等）
4. 自動部署完成

詳細步驟請參考 [app/README.md](./app/README.md)

## 📚 使用示範

### 測試案例
```python
user_input = "我喜歡清爽氣泡的調酒，請你推薦我一杯調酒。同時也請你跟我說明夢酒館在地方所做的貢獻，還有夢酒館登過的國際媒體報導。"
```

### 系統處理流程
1. **語意拆解**:
   - 子問句1：我喜歡清爽氣泡的調酒。
   - 子問句2：請你推薦我一杯調酒。
   - 子問句3：請你跟我說明夢酒館在地方所做的貢獻。
   - 子問句4：請你說明夢酒館登過的國際媒體報導。

2. **個別檢索**: 針對每個子句分別檢索相關資料

3. **整合回答**: 根據原始問句整合生成完整回覆

## 🛣️ 未來改善方向

1. 解決內容組合錯誤問題
2. 優化 chunking 策略
3. 增加評估機制
