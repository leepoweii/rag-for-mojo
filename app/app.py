"""
夢酒館 RAG 品牌大使 Flask App
"""
import os
import json
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from dotenv import load_dotenv
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from openai import OpenAI

# 載入環境變數
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'mojo-dream-bar-secret-key')

# OpenAI 設定
api_key = os.getenv("OPENAI_API_KEY")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
embedding_model_name = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")

client = OpenAI(api_key=api_key)


# 自訂 E5 Embedding 類別
class CustomE5Embedding(HuggingFaceEmbeddings):
    def embed_documents(self, texts):
        texts = [f"passage: {t}" for t in texts]
        return super().embed_documents(texts)

    def embed_query(self, text):
        return super().embed_query(f"query: {text}")


# 載入 FAISS 向量資料庫
print("載入向量資料庫...")
embedding_model = CustomE5Embedding(model_name=embedding_model_name)
db = FAISS.load_local("faiss_db", embedding_model, allow_dangerous_deserialization=True)
retriever = db.as_retriever()
print("向量資料庫載入完成")


# System Prompts
SYSTEM_PROMPT_SEPARATE = """
你是一位專門協助語意拆解的 AI 工具設計師，任務是將使用者輸入的複合問題，轉換成清楚、可獨立檢索的子問題。

請依照以下規則進行拆解：

1. 若問題中包含兩個以上的子句（例如多個動作、主詞、或時間條件），請將其拆成多個子問題。
2. 每個子問題應該是完整的句子，能夠獨立被語意檢索模型理解。
3. 拆解後請用 JSON array 格式回傳，例如：["夢酒館有登過哪些國際媒體？", "夢酒館登上國際媒體的是哪些調酒？"]
4. 若問題本身已經是單一子句，請回傳原句構成的 JSON array。
5. 除了 JSON array 之外，不要回傳任何說明。
6. 請確保回傳的是有效的 JSON 格式。

請注意：不要自行補充或改寫原始問題的語意，只做語意拆解。
"""

SYSTEM_PROMPT_BRAND = """
你是『把夢酒館介紹給旅客的品牌大使』—— 一位兼具雞尾酒專業、地方文化策展力的品牌介紹人員。
你的任務是依據被提供的內容，親切生動地向來訪旅客講解夢酒館的故事、雞尾酒靈感及我們在金門推動的地方創生行動。
請以繁體中文作為回答語言，回答要溫暖、專業。
請根據來源資料回答，若資料中未明確提及，請不要自行組合資訊。
"""

PROMPT_TEMPLATE = """
旅客問題：
{main_query}

根據下列資料來回應訪客問題，務必貼合資料細節並保持品牌語氣：
{retrieved_answers}

請依據下列規範作答：
1. 可以的話，附上相關連結或實際案例說明。
2. 如果知識庫無法支援完整答案，請誠實說明並提出可協助的後續方向 (ex. 請 Email 到 contact@mojokm.com)，可以推薦一個最接近的，但不要自行組合資訊。
3. 請一定要全程使用台灣人慣用的繁體中文來回答。
4. 在推薦調酒之前，請先了解對方的口味喜好，否則以品牌故事理念為主要回答。
5. 請避免將不同調酒的描述混合使用，除非資料中有明確比較。
"""


def separate_queries(user_input):
    """將複合問句拆解成多個子問題"""
    prompt = f"請將下列文字，重新拆解成不同的子句，並且整理成一個 JSON array 回傳。\n{user_input}"

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_SEPARATE},
            {"role": "user", "content": prompt},
        ]
    )
    raw_output = response.choices[0].message.content.strip()

    try:
        sub_queries = json.loads(raw_output)
    except json.JSONDecodeError:
        sub_queries = [user_input]

    return {
        "main_query": user_input,
        "sub_queries": sub_queries
    }


def retrieve_answers(queries_list, top_k=3):
    """針對每個子問題檢索相關文件"""
    results = []
    for sub_query in queries_list:
        docs = retriever.invoke(sub_query, config=dict(k=top_k))
        retrieved_chunks = [doc.page_content for doc in docs]
        results.append({
            "sub_query": sub_query,
            "chunks": retrieved_chunks
        })
    return results


def integrate_answers(main_query, retrieved_answers):
    """整合檢索結果並生成最終回答"""
    final_prompt = PROMPT_TEMPLATE.format(
        main_query=main_query,
        retrieved_answers=retrieved_answers
    )

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_BRAND},
            {"role": "user", "content": final_prompt},
        ]
    )
    return response.choices[0].message.content


@app.route('/')
def index():
    """首頁"""
    return render_template('index.html')


@app.route('/api/chat', methods=['POST'])
def chat():
    """處理聊天請求"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()

        if not user_message:
            return jsonify({'error': '請輸入訊息'}), 400

        # 1. 語意拆解
        result = separate_queries(user_message)
        main_query = result['main_query']
        queries_list = result['sub_queries']

        # 2. 個別檢索
        retrieved_answers = retrieve_answers(queries_list)

        # 3. 整合回答
        response = integrate_answers(main_query, retrieved_answers)

        return jsonify({
            'response': response,
            'status': 'success'
        })

    except Exception as e:
        print(f"錯誤: {str(e)}")
        return jsonify({
            'error': '處理訊息時發生錯誤，請稍後再試',
            'status': 'error'
        }), 500


@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    """Streaming chat endpoint with thinking visualization"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()

        if not user_message:
            return jsonify({'error': '請輸入訊息'}), 400

        def generate():
            try:
                # Stage 1: Query Decomposition
                result = separate_queries(user_message)
                main_query = result['main_query']
                queries_list = result['sub_queries']

                stage1_data = {
                    'type': 'stage1',
                    'data': {
                        'original_query': main_query,
                        'sub_queries': queries_list
                    }
                }
                yield f"data: {json.dumps(stage1_data)}\n\n"

                # Stage 2: Individual Retrieval
                retrieved_answers = retrieve_answers(queries_list)

                stage2_data = {
                    'type': 'stage2',
                    'data': retrieved_answers
                }
                yield f"data: {json.dumps(stage2_data)}\n\n"

                # Stage 3: Integration Metadata
                # Build the final prompt that will be sent to LLM
                final_prompt = PROMPT_TEMPLATE.format(
                    main_query=main_query,
                    retrieved_answers=retrieved_answers
                )

                stage3_data = {
                    'type': 'stage3',
                    'data': {
                        'method': 'LLM integration with brand voice',
                        'note': 'Combined all retrieved information',
                        'final_prompt': final_prompt
                    }
                }
                yield f"data: {json.dumps(stage3_data)}\n\n"

                # Final Answer
                response = integrate_answers(main_query, retrieved_answers)

                final_data = {
                    'type': 'final_answer',
                    'data': response
                }
                yield f"data: {json.dumps(final_data)}\n\n"

                # Stream complete
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                print(f"Stream error: {str(e)}")
                error_data = {
                    'type': 'error',
                    'message': '處理訊息時發生錯誤'
                }
                yield f"data: {json.dumps(error_data)}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )

    except Exception as e:
        print(f"錯誤: {str(e)}")
        return jsonify({
            'error': '處理訊息時發生錯誤，請稍後再試',
            'status': 'error'
        }), 500


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
