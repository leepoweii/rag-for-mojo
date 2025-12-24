#!/bin/bash
# 夢酒館 RAG App 启动脚本

echo "Starting 夢酒館 RAG App..."

# 使用 Gunicorn 启动 Flask 应用
# --preload: 预加载应用代码，向量数据库只加载一次
# --timeout 300: 设置超时为 5 分钟（向量数据库加载需要时间）
# --workers 1: 使用单个 worker（避免多次加载向量数据库）
# --bind 0.0.0.0:$PORT: 绑定到环境变量指定的端口

PORT=${PORT:-8080}

exec gunicorn \
    --preload \
    --timeout 300 \
    --workers 1 \
    --bind 0.0.0.0:$PORT \
    --access-logfile - \
    --error-logfile - \
    app:app
