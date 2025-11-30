#!/bin/bash

# GraphRAG 集成应用停止脚本

echo "======================================"
echo "  停止 GraphRAG 集成应用"
echo "======================================"
echo ""

# 读取 PID 文件
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    echo "停止后端服务 (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    rm .backend.pid
    echo "后端已停止"
else
    echo "未找到后端进程"
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    echo "停止前端应用 (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    rm .frontend.pid
    echo "前端已停止"
else
    echo "未找到前端进程"
fi

# 额外清理：查找并停止可能残留的进程
echo ""
echo "清理残留进程..."

# 停止 Flask 进程
pkill -f "python.*app.py" 2>/dev/null

# 停止 React 进程
pkill -f "react-scripts start" 2>/dev/null

echo ""
echo "应用已完全停止"
