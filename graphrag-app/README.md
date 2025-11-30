# GraphRAG 集成应用 - 现代化版本

一款采用现代化 UI 设计的 GraphRAG 集成应用，提供索引构建、智能问答、知识图谱可视化、文件浏览等功能。

## 🎨 全新设计亮点

### 视觉设计
- ✨ **深色主题**：舒适的深色配色，减少眼睛疲劳
- 🌈 **渐变色彩**：青色 (#00d4ff) 和粉色 (#ff6b9d) 的现代渐变
- 💎 **玻璃态效果**：毛玻璃背景和半透明面板
- ⚡ **流畅动画**：平滑的过渡和交互反馈
- 🎯 **圆角设计**：统一的 16px 圆角，更加柔和

### 核心配色方案
```
主色调 (Primary):    #00d4ff - 青色
辅助色 (Secondary):  #ff6b9d - 粉色
背景色 (Background):  #0f0f23 - 深蓝黑
面板色 (Paper):       #1a1a2e - 深灰蓝
文本色 (Text):        #e8eaed - 浅灰白
辅助文本:             #9aa0a6 - 中灰
```

## ⚙️ 环境配置

### 虚拟环境
使用共享虚拟环境：`/Volumes/WD Blue SN5000 Media/Users/Desktop/study/KG/.venv`

### 端口配置
- **后端 API**: http://localhost:5001
- **前端界面**: http://localhost:3001

## 🚀 快速开始

### 方法一：一键启动（推荐）

在 `graphrag-app` 目录下运行：

```bash
./start.sh
```

这将自动启动后端和前端服务。访问：
- **前端界面**：http://localhost:3001
- **后端 API**：http://localhost:5001/api/health

停止服务：
```bash
./stop.sh
```

### 方法二：手动启动

#### 1. 安装依赖（仅首次需要）

**后端依赖：**
```bash
source /Volumes/WD\ Blue\ SN5000\ Media/Users/Desktop/study/KG/.venv/bin/activate
pip install flask flask-cors pandas pyarrow python-dotenv pyyaml
```

**前端依赖：**
```bash
cd frontend
npm install
```

#### 2. 启动应用

**终端 1 - 后端：**
```bash
cd backend
source /Volumes/WD\ Blue\ SN5000\ Media/Users/Desktop/study/KG/.venv/bin/activate
python app.py
```

**终端 2 - 前端：**
```bash
cd frontend
npm start
```

#### 3. 访问
- 前端：http://localhost:3001
- 后端：http://localhost:5001/api/health

## 🎯 界面功能

### 1. 侧边栏
- **渐变背景**：青色到粉色的微妙渐变
- **品牌标识**：带发光效果的图标
- **选中状态**：清晰的高亮效果
- **版本信息**：底部显示版本号

### 2. 知识图谱（左侧 70%）
- **星空背景**：深色背景配合径向渐变
- **节点发光**：节点带有阴影发光效果
- **实体类型**：
  - 🔴 组织 - #ff6b9d（粉色）
  - 🔵 人物 - #00d4ff（青色）
  - 🟣 地点 - #7b68ee（紫色）
  - 🟠 事件 - #ffa500（橙色）
  - 🟢 其他 - #00e5cc（青绿色）
- **粒子效果**：关系连线带有流动粒子
- **详情面板**：点击节点显示详细信息
- **统计信息**：右上角实时统计
- **图例说明**：右下角类型图例

### 3. 智能问答（右侧 30%）
- **渐变头部**：青粉渐变背景
- **模式切换**：本地搜索 ⚡ / 全局搜索 🌐
- **消息气泡**：
  - 用户消息：青色渐变，右对齐
  - AI 消息：深色面板，左对齐
- **建议问题**：快速开始对话
- **脉冲动画**：空状态时的呼吸灯效果
- **智能输入框**：带焦点高亮的输入框

### 4. 文件浏览器
- **浮动按钮**：左下角青色渐变按钮
- **文件树导航**：面包屑导航
- **双栏布局**：文件列表 + 预览
- **支持操作**：
  - 浏览 input/output/cache 目录
  - 预览文本文件（限 1MB）
  - 显示文件大小和类型

## 📋 技术栈

### 前端
- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Material-UI 5** - 组件库
- **react-force-graph-2d** - 图谱可视化
- **Axios** - HTTP 客户端

### 后端
- **Flask 3.0** - Web 框架
- **GraphRAG** - 知识图谱引擎
- **Pandas + PyArrow** - 数据处理

## 🎨 设计系统

### 间距规范
- 小间距：8px
- 中间距：16px
- 大间距：24px、32px

### 圆角规范
- 按钮：12px
- 卡片/面板：16px
- 对话框：16px

### 阴影效果
- 默认：无阴影
- 悬停：`0 8px 24px rgba(0, 212, 255, 0.25)`
- 强调：`0 8px 32px rgba(0, 212, 255, 0.3)`

### 过渡动画
- 默认：`all 0.3s ease`
- 快速：`all 0.2s ease`
- 缓慢：`all 0.5s ease`

## 📱 响应式设计

- 知识图谱：70% 宽度
- 问答窗口：30% 宽度
- 侧边栏：260px 固定宽度
- 最小分辨率：1280x720

## 🛠️ 开发指南

### 颜色使用
```typescript
// 主色调
primary: '#00d4ff'      // 按钮、链接、强调
secondary: '#ff6b9d'    // 辅助强调、警告

// 背景色
background: '#0f0f23'   // 页面背景
paper: '#1a1a2e'        // 卡片、面板

// 文本色
text.primary: '#e8eaed'     // 主要文本
text.secondary: '#9aa0a6'   // 辅助文本
```

### 渐变使用
```css
/* 青色渐变 */
background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)

/* 粉色渐变 */
background: linear-gradient(135deg, #ff6b9d 0%, #c93d6f 100%)

/* 混合渐变 */
background: linear-gradient(135deg, #00d4ff 0%, #ff6b9d 100%)
```

## 🔧 自定义配置

### 修改主题颜色
编辑 [frontend/src/App.tsx](frontend/src/App.tsx#L7-L90)

### 修改布局比例
编辑 [frontend/src/components/HomePage.tsx](frontend/src/components/HomePage.tsx#L24-L31)

### 修改节点颜色
编辑 [frontend/src/components/KnowledgeGraph.tsx](frontend/src/components/KnowledgeGraph.tsx#L58-L66)

## 📝 API 文档

### 图谱相关
- `GET /api/graph` - 获取图谱数据
- `GET /api/health` - 健康检查

### 查询相关
- `POST /api/query/local` - 本地搜索
- `POST /api/query/global` - 全局搜索

### 文件相关
- `GET /api/files/list?path=<path>` - 列出文件
- `GET /api/files/read?path=<path>` - 读取文件
- `GET /api/files/stats` - 文件统计

### 索引和设置
- `POST /api/index/build` - 构建索引
- `GET /api/settings` - 获取设置
- `PUT /api/settings` - 更新设置

## 🎁 版本更新

### v2.0.0 - 2024-12-01
- ✅ 全新的现代化 UI 设计
- ✅ 深色主题配色
- ✅ 青粉渐变色系
- ✅ 优化知识图谱可视化
- ✅ 重新设计对话界面
- ✅ 改进侧边栏体验
- ✅ 统一设计语言

### v1.1.0 - 2024-12-01
- ✅ 添加文件浏览器功能
- ✅ ChatGPT 风格问答界面

### v1.0.0 - 2024-12-01
- ✅ 初始版本发布

## 💡 使用技巧

1. **快速缩放**：使用鼠标滚轮缩放图谱
2. **节点详情**：点击节点查看详细信息
3. **快速提问**：点击建议问题快速开始
4. **模式切换**：根据问题选择本地或全局搜索
5. **文件浏览**：点击左下角按钮浏览所有文件

## 🐛 故障排查

### 前端无法启动
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### 后端连接失败
检查后端是否运行在 5001 端口：
```bash
lsof -i :5001
```

### 图谱数据为空
确保已构建索引：
```bash
ls ../graphrag/ragtest/output/*.parquet
```

## 📄 许可证

MIT License

---

**由 Claude 设计开发** | Powered by GraphRAG
