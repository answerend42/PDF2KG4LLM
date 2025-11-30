#!/bin/bash

# GraphRAG 集成应用启动脚本

echo "======================================"
echo "  GraphRAG 集成应用启动脚本"
echo "======================================"
echo ""

# 设置路径
VENV_PATH="/Volumes/WD Blue SN5000 Media/Users/Desktop/study/KG/.venv"

# 检查是否在正确的目录
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "错误: 请在 graphrag-app 目录下运行此脚本"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "$VENV_PATH" ]; then
    echo "错误: 虚拟环境不存在: $VENV_PATH"
    echo "请先创建虚拟环境"
    exit 1
fi

# 启动后端
echo "[1/2] 启动后端服务..."
cd backend

# 激活虚拟环境并启动 Flask 服务（后台运行）
source "$VENV_PATH/bin/activate" && python app.py > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "后端服务已启动 (PID: $BACKEND_PID)"
echo "日志输出到: backend.log"

cd ..

# 等待后端启动
echo "等待后端服务启动..."
sleep 3

# 启动前端
echo ""
echo "[2/2] 启动前端应用..."
cd frontend

# 启动 React 应用（后台运行）
PORT=3001 npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "前端应用已启动 (PID: $FRONTEND_PID)"
echo "日志输出到: frontend.log"

cd ..

echo ""
echo "======================================"
echo "  应用启动完成！"
echo "======================================"
echo ""
echo "后端地址: http://localhost:5001"
echo "前端地址: http://localhost:3001"
echo ""
echo "进程 ID:"
echo "  后端: $BACKEND_PID"
echo "  前端: $FRONTEND_PID"
echo ""
echo "停止应用:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "或者运行: ./stop.sh"
echo ""

# 保存 PID 到文件以便后续停止
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid

echo "按 Ctrl+C 不会停止服务，请使用上述命令停止"
