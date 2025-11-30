# GraphRAG 集成应用开发文档

## 📋 项目概述

这是一个基于 GraphRAG 的知识图谱可视化和智能问答集成应用，采用现代化深色主题设计，提供索引构建、智能问答、知识图谱可视化、文件浏览等功能。

### 核心特性

- ✅ **知识图谱可视化**：交互式图谱展示，支持节点点击、缩放、拖拽
- ✅ **智能问答系统**：支持本地搜索和全局搜索两种模式
- ✅ **文件浏览器**：浏览和预览 ragtest 目录中的所有文件
- ✅ **设置管理**：查看和编辑 GraphRAG 配置文件
- ✅ **一键启动**：通过脚本自动启动前后端服务
- ✅ **现代化 UI**：深色主题 + 青粉渐变色系 + 玻璃态效果

---

## 🏗️ 架构设计

### 技术栈

#### 前端
- **React 18.3.1** - UI 框架
- **TypeScript 4.9.5** - 类型安全
- **Material-UI 5.x** - 组件库
- **react-force-graph-2d 1.25.6** - 图谱可视化
- **Axios 1.7.9** - HTTP 客户端

#### 后端
- **Flask 3.0.0** - Web 框架
- **Flask-CORS 4.0.0** - 跨域支持
- **GraphRAG 2.7.0** - 知识图谱引擎
- **Pandas 2.3.3** - 数据处理
- **PyArrow 22.0.0** - Parquet 文件读取
- **PyYAML 6.0.3** - YAML 配置文件处理

### 目录结构

```
graphrag-app/
├── backend/                    # Flask 后端
│   ├── app.py                 # 主应用文件
│   └── requirements.txt       # Python 依赖
├── frontend/                   # React 前端
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/        # React 组件
│   │   │   ├── Sidebar.tsx           # 侧边栏
│   │   │   ├── HomePage.tsx          # 主页面
│   │   │   ├── KnowledgeGraph.tsx    # 知识图谱
│   │   │   ├── ChatPanel.tsx         # 对话面板
│   │   │   ├── FileBrowser.tsx       # 文件浏览器
│   │   │   └── SettingsPage.tsx      # 设置页面
│   │   ├── services/
│   │   │   └── api.ts         # API 服务层
│   │   ├── types/
│   │   │   └── index.ts       # TypeScript 类型定义
│   │   ├── styles/
│   │   │   └── index.css      # 全局样式
│   │   ├── App.tsx            # 根组件
│   │   └── index.tsx          # 入口文件
│   ├── package.json
│   └── tsconfig.json
├── start.sh                    # 启动脚本
├── stop.sh                     # 停止脚本
├── README.md                   # 用户文档
└── DEVELOPMENT.md             # 开发文档（本文件）
```

---

## 🎨 UI 设计系统

### 配色方案

```typescript
// 主题配置 (frontend/src/App.tsx)
const theme = {
  palette: {
    primary: {
      main: '#00d4ff',      // 青色 - 主色调
      light: '#4ddfff',     // 浅青色
      dark: '#00a8cc',      // 深青色
    },
    secondary: {
      main: '#ff6b9d',      // 粉色 - 辅助色
      light: '#ff9abb',     // 浅粉色
      dark: '#c93d6f',      // 深粉色
    },
    background: {
      default: '#0f0f23',   // 深蓝黑 - 页面背景
      paper: '#1a1a2e',     // 深灰蓝 - 卡片/面板背景
    },
    text: {
      primary: '#e8eaed',   // 浅灰白 - 主要文本
      secondary: '#9aa0a6', // 中灰 - 辅助文本
    },
  }
}
```

### 实体类型颜色

```typescript
// KnowledgeGraph.tsx 中定义
const entityColors = {
  organization: '#ff6b9d',  // 组织 - 粉色
  person: '#00d4ff',        // 人物 - 青色
  geo: '#7b68ee',           // 地点 - 紫色
  event: '#ffa500',         // 事件 - 橙色
  entity: '#00e5cc',        // 其他 - 青绿色
}
```

### 设计规范

#### 间距
- 小间距：8px (gap: 1)
- 中间距：16px (gap: 2, padding: 2)
- 大间距：24px (padding: 3), 32px

#### 圆角
- 按钮：12px
- 卡片/面板：16px
- 输入框：12px

#### 阴影效果
```css
/* 默认 */
box-shadow: none

/* 悬停 - 青色发光 */
box-shadow: 0 8px 24px rgba(0, 212, 255, 0.25)

/* 强调 - 青色强发光 */
box-shadow: 0 8px 32px rgba(0, 212, 255, 0.3)

/* 粉色发光 */
box-shadow: 0 8px 32px rgba(255, 107, 157, 0.3)
```

#### 渐变效果
```css
/* 青色渐变 */
background: linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)

/* 粉色渐变 */
background: linear-gradient(135deg, #ff6b9d 0%, #c93d6f 100%)

/* 混合渐变 */
background: linear-gradient(135deg, #00d4ff 0%, #ff6b9d 100%)

/* 径向渐变（背景） */
background-image: radial-gradient(
  circle at 10% 20%,
  rgba(0, 212, 255, 0.03) 0%,
  transparent 50%
)
```

---

## 🔧 核心功能实现

### 1. 后端 API (backend/app.py)

#### 重要说明
由于 GraphRAG 2.7.0 的 API 变更，移除了 `graphrag.query.llm.oai` 模块，当前版本采用简化实现：
- 查询功能返回提示消息，不执行实际的 GraphRAG 查询
- 图谱可视化和文件浏览功能正常工作
- 未来需要根据 GraphRAG 最新 API 重新实现查询功能

#### 配置

```python
# 关键路径配置
RAGTEST_PATH = str(Path(__file__).parent.parent.parent / "graphrag" / "ragtest")
OUTPUT_PATH = os.path.join(RAGTEST_PATH, "output")
```

#### 核心函数

**1. 加载图谱数据**
```python
def load_graph_data():
    """从 parquet 文件加载图谱数据"""
    # 读取实体文件
    entities = pd.read_parquet(
        os.path.join(OUTPUT_PATH, "create_final_entities.parquet")
    )
    # 读取关系文件
    relationships = pd.read_parquet(
        os.path.join(OUTPUT_PATH, "create_final_relationships.parquet")
    )

    # 构建节点数据
    nodes = [{
        "id": str(row.get("id", row.get("title", ""))),
        "name": str(row.get("title", "")),
        "type": str(row.get("type", "entity")),
        "description": str(row.get("description", ""))[:200],
        "degree": int(row.get("degree", 0)),
    } for _, row in entities.iterrows()]

    # 构建连接数据
    links = [{
        "source": str(row.get("source", "")),
        "target": str(row.get("target", "")),
        "description": str(row.get("description", ""))[:100],
        "weight": float(row.get("weight", 1.0)),
    } for _, row in relationships.iterrows()]

    return {"nodes": nodes, "links": links}
```

#### API 端点

| 方法 | 路径 | 功能 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 健康检查 | 返回服务状态 |
| GET | `/api/graph` | 获取图谱数据 | 返回节点和边数据 |
| POST | `/api/query/local` | 本地搜索 | 简化版本，返回提示消息 |
| POST | `/api/query/global` | 全局搜索 | 简化版本，返回提示消息 |
| POST | `/api/index/build` | 构建索引 | 执行 graphrag index 命令 |
| GET | `/api/settings` | 获取设置 | 读取 settings.yaml |
| PUT | `/api/settings` | 更新设置 | 写入 settings.yaml |
| GET | `/api/files/list` | 列出文件 | 列出目录内容 |
| GET | `/api/files/read` | 读取文件 | 读取文本文件内容（限 1MB） |
| GET | `/api/files/stats` | 文件统计 | 返回文件数量和大小统计 |

### 2. 前端组件

#### App.tsx - 根组件
- 配置 MUI 主题
- 管理侧边栏展开/收起状态
- 管理页面切换（主页/设置页）

```typescript
const [sidebarOpen, setSidebarOpen] = useState(true);
const [currentPage, setCurrentPage] = useState<'home' | 'settings'>('home');
```

#### Sidebar.tsx - 侧边栏
- 渐变背景：`linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)`
- 发光 Logo 图标
- 页面切换按钮（主页、设置）
- 底部版本信息

#### HomePage.tsx - 主页面
- 70/30 布局：知识图谱（左）+ 对话面板（右）
- 浮动文件浏览器按钮（左下角）

```typescript
<Box sx={{ flex: 7 }}>  {/* 知识图谱 70% */}
  <KnowledgeGraph height="100%" />
</Box>
<Box sx={{ flex: 3 }}>  {/* 对话面板 30% */}
  <ChatPanel height="100%" />
</Box>
```

#### KnowledgeGraph.tsx - 知识图谱
**核心功能：**
- 使用 `react-force-graph-2d` 渲染图谱
- 节点发光效果（`ctx.shadowBlur`）
- 连接线粒子动画
- 节点点击显示详情
- 统计面板（节点数/关系数）
- 实体类型图例

**关键代码：**
```typescript
// 节点渲染（带发光效果）
nodeCanvasObject={(node, ctx, globalScale) => {
  const size = getNodeSize(node);
  const color = getNodeColor(node);

  // 发光效果
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
  ctx.fill();
  ctx.shadowBlur = 0;
}}

// 粒子动画
linkDirectionalParticles={2}
linkDirectionalParticleWidth={2}
linkDirectionalParticleColor={() => alpha('#00d4ff', 0.6)}
```

#### ChatPanel.tsx - 对话面板
**核心功能：**
- 模式切换：本地搜索 ⚡ / 全局搜索 🌐
- 消息列表展示
- 空状态（带脉冲动画的欢迎界面）
- 建议问题快速开始
- 智能输入框（焦点高亮）

**消息样式：**
```typescript
// 用户消息 - 青色渐变，右对齐
background: 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)'

// AI 消息 - 深色面板，左对齐
backgroundColor: alpha('#1a1a2e', 0.8)
border: `1px solid ${alpha('#00d4ff', 0.2)}`
```

#### FileBrowser.tsx - 文件浏览器
**核心功能：**
- 模态对话框形式
- 面包屑导航
- 双栏布局：文件列表 + 预览
- 支持文本文件预览（限 1MB）
- 显示文件大小、类型、数量统计

#### SettingsPage.tsx - 设置页面
**核心功能：**
- 索引构建按钮
- 查看/编辑 `settings.yaml`
- API 配置（API Key、Base URL、模型等）

### 3. API 服务层 (frontend/src/services/api.ts)

```typescript
const API_BASE_URL = 'http://localhost:5001/api';

export const apiService = {
  // 获取图谱数据
  getGraph: async (): Promise<GraphData> => {
    const response = await axios.get(`${API_BASE_URL}/graph`);
    return response.data;
  },

  // 本地搜索
  localQuery: async (question: string): Promise<QueryResponse> => {
    const response = await axios.post(`${API_BASE_URL}/query/local`, {
      question,
    });
    return response.data;
  },

  // ... 其他 API 方法
};
```

---

## 🚀 部署和启动

### 环境要求

- **Python**: 3.11+
- **Node.js**: 16+
- **npm**: 8+

### 虚拟环境

共享虚拟环境位置：
```
/Volumes/WD Blue SN5000 Media/Users/Desktop/study/KG/.venv
```

### 端口配置

- **后端**: http://localhost:5001
- **前端**: http://localhost:3001

### 一键启动

```bash
# 在 graphrag-app 目录下
./start.sh
```

启动脚本会：
1. 激活虚拟环境
2. 后台启动 Flask（输出到 `backend.log`）
3. 后台启动 React（输出到 `frontend.log`）
4. 保存进程 ID 到 `.backend.pid` 和 `.frontend.pid`

### 停止服务

```bash
./stop.sh
```

停止脚本会：
1. 读取 PID 文件并 kill 进程
2. 清理 PID 文件
3. 额外清理可能残留的进程

### 查看日志

```bash
# 实时查看后端日志
tail -f backend.log

# 实时查看前端日志
tail -f frontend.log
```

---

## 🔍 关键修改记录

### 版本 2.0.0 (2024-12-01)

#### 1. 后端简化 (app.py)
**原因**: GraphRAG 2.7.0 移除了 `graphrag.query.llm.oai` 模块

**修改**:
- ❌ 移除所有 GraphRAG query 相关导入
- ✅ 保留图谱数据加载功能
- ✅ 查询端点返回简化消息
- ✅ 文件浏览、设置管理功能正常

**受影响的端点**:
```python
# 简化版本 - 不执行实际查询
@app.route('/api/query/local', methods=['POST'])
def local_query():
    # 返回提示消息而非实际查询结果
    response_text = f"收到您的问题：{question}\n\n..."
    return jsonify({"response": response_text, "context_data": {...}})
```

#### 2. UI 全面重设计

**改动组件**:
- `App.tsx` - 重新配置主题色系
- `Sidebar.tsx` - 完全重写，渐变背景 + 发光效果
- `KnowledgeGraph.tsx` - 添加节点发光、粒子动画
- `ChatPanel.tsx` - 重新设计消息气泡、空状态
- `HomePage.tsx` - 优化布局和间距

**视觉改进**:
- 深色主题替代浅色主题
- 青粉渐变色系替代单一蓝色
- 玻璃态效果（backdrop-filter）
- 节点和连接线动画效果
- 统一的圆角和间距规范

#### 3. 启动脚本完善

**start.sh**:
- 自动检查目录和虚拟环境
- 后台运行服务
- 日志输出到文件
- 保存 PID 便于管理

**stop.sh**:
- 读取 PID 文件停止进程
- 清理残留进程
- 删除 PID 文件

---

## 🐛 已知问题

### 1. GraphRAG 查询功能未实现
**状态**: ⚠️ 待解决

**原因**: GraphRAG 2.7.0 API 变更，移除了 `query.llm.oai` 模块

**临时方案**: 查询端点返回提示消息

**解决方案**:
- 等待 GraphRAG 官方文档更新
- 参考新 API 重新实现查询功能
- 可能需要的新导入：
  ```python
  # 待确认的新 API
  from graphrag.query import LocalSearch, GlobalSearch
  # 或其他新模块
  ```

### 2. 文件预览限制
**限制**: 只能预览 1MB 以下的文本文件

**原因**: 防止浏览器卡顿

**可能改进**:
- 添加分页加载
- 支持更多文件类型（PDF、CSV 等）

### 3. 响应式设计
**状态**: 仅支持桌面端

**最小分辨率**: 1280x720

**可能改进**: 添加移动端适配

---

## 📝 开发指南

### 添加新的 API 端点

**1. 后端 (backend/app.py)**
```python
@app.route('/api/your-endpoint', methods=['GET', 'POST'])
def your_endpoint():
    try:
        # 处理请求
        data = request.json  # POST
        # 或
        param = request.args.get('param')  # GET

        # 业务逻辑
        result = do_something(data)

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```

**2. 前端 API 服务 (frontend/src/services/api.ts)**
```typescript
export const apiService = {
  // ... 现有方法

  yourEndpoint: async (data: YourDataType): Promise<YourResponseType> => {
    const response = await axios.post(`${API_BASE_URL}/your-endpoint`, data);
    return response.data;
  },
};
```

**3. 类型定义 (frontend/src/types/index.ts)**
```typescript
export interface YourDataType {
  field1: string;
  field2: number;
}

export interface YourResponseType {
  result: string;
}
```

### 添加新的 UI 组件

**1. 创建组件文件**
```typescript
// frontend/src/components/YourComponent.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';

interface YourComponentProps {
  prop1: string;
}

const YourComponent: React.FC<YourComponentProps> = ({ prop1 }) => {
  return (
    <Box
      sx={{
        padding: 3,
        backgroundColor: '#1a1a2e',
        borderRadius: 4,
      }}
    >
      <Typography variant="h6" sx={{ color: '#e8eaed' }}>
        {prop1}
      </Typography>
    </Box>
  );
};

export default YourComponent;
```

**2. 使用组件**
```typescript
import YourComponent from './components/YourComponent';

// 在其他组件中
<YourComponent prop1="Hello" />
```

### 修改主题

编辑 `frontend/src/App.tsx` 中的 theme 配置：

```typescript
const theme = createTheme({
  palette: {
    primary: {
      main: '#your-color',  // 修改主色调
    },
    // ... 其他配色
  },
});
```

### 调试技巧

**1. 后端调试**
```bash
# 查看后端日志
tail -f backend.log

# 或直接运行（不后台）
cd backend
source /path/to/.venv/bin/activate
python app.py
```

**2. 前端调试**
```bash
# 查看前端日志
tail -f frontend.log

# 或直接运行（不后台）
cd frontend
npm start
```

**3. API 测试**
```bash
# 测试健康检查
curl http://localhost:5001/api/health

# 测试图谱数据
curl http://localhost:5001/api/graph

# 测试查询
curl -X POST http://localhost:5001/api/query/local \
  -H "Content-Type: application/json" \
  -d '{"question": "测试问题"}'
```

---

## 🔄 未来改进方向

### 短期 (1-2 周)

1. **恢复查询功能**
   - 研究 GraphRAG 2.7.0 新 API
   - 重新实现本地和全局搜索
   - 添加查询结果缓存

2. **性能优化**
   - 图谱数据懒加载
   - 虚拟滚动优化长消息列表
   - 图谱渲染性能优化（WebGL）

3. **用户体验**
   - 添加加载进度条
   - 优化错误提示
   - 添加快捷键支持

### 中期 (1-2 月)

1. **功能增强**
   - 支持多文档上传
   - 图谱导出（PNG、SVG、JSON）
   - 对话历史保存和恢复
   - 高级搜索过滤

2. **可视化改进**
   - 3D 图谱模式
   - 社区聚类高亮
   - 时间轴视图
   - 实体关系路径查询

3. **设置扩展**
   - 多模型切换
   - 自定义提示词模板
   - 索引参数配置

### 长期 (3+ 月)

1. **多用户支持**
   - 用户认证和授权
   - 项目隔离
   - 协作编辑

2. **部署优化**
   - Docker 容器化
   - 生产环境配置
   - 自动化测试

3. **移动端适配**
   - 响应式设计
   - 触摸手势支持
   - PWA 支持

---

## 📚 参考资料

### 官方文档
- [GraphRAG GitHub](https://github.com/microsoft/graphrag)
- [React 文档](https://react.dev/)
- [Material-UI 文档](https://mui.com/)
- [Flask 文档](https://flask.palletsprojects.com/)

### 依赖库文档
- [react-force-graph](https://github.com/vasturiano/react-force-graph)
- [Axios](https://axios-http.com/)
- [Pandas](https://pandas.pydata.org/)

### 设计参考
- [Material Design 3](https://m3.material.io/)
- [Color Hunt](https://colorhunt.co/) - 配色灵感

---

## 👥 贡献指南

### 提交代码

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

### 代码规范

**Python**
- 遵循 PEP 8
- 使用类型提示
- 添加文档字符串

**TypeScript/React**
- 使用 TypeScript strict 模式
- 遵循 Airbnb React 规范
- 组件使用函数式写法
- Props 使用接口定义

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型**:
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行）
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建过程或辅助工具变动

**示例**:
```
feat(chat): 添加消息搜索功能

- 添加搜索输入框
- 实现消息过滤逻辑
- 高亮搜索结果

Closes #123
```

---

## 📄 许可证

MIT License

---

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- GitHub Issues
- Email: [your-email@example.com]

---

**文档版本**: v2.0.0
**最后更新**: 2024-12-01
**维护者**: Claude & Development Team
