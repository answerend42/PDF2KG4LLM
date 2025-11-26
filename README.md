# PDF2KG4LLM

将 PDF 文档转换为知识图谱，使用 DeepSeek API 提取实体和关系，支持 NetworkX 可视化和 Neo4j 存储。

## 快速开始

### 1. 环境准备

#### 安装 uv（Python 包管理器）

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

#### 安装项目依赖

```bash
uv sync
```

### 2. 配置 API 密钥

复制环境变量模板并填入你的 DeepSeek API Key：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DEEPSEEK_API_KEY=your_actual_api_key_here
```

> 获取 API Key: https://platform.deepseek.com/

### 3. 启动 Neo4j（可选）

如果需要将知识图谱存储到 Neo4j 数据库：

```bash
# 拉取并启动 Neo4j Docker 容器
docker run -d \
  --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password123 \
  neo4j:latest
```

访问 Neo4j 浏览器界面：http://localhost:7474
- 用户名：`neo4j`
- 密码：`password`

在 `.env` 中添加 Neo4j 配置：

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
```

### 4. 准备 PDF 文件

将你的 PDF 文件放到 `data/` 目录：

```bash
mkdir -p data
# 将 PDF 文件复制到 data/ 目录
```

### 5. 运行批量处理

启动 Jupyter Notebook：

```bash
jupyter notebook pdf2kg_batch.ipynb
```

或使用 JupyterLab：

```bash
jupyter lab
```

## 关键文件和配置

### 需要修改的地方

1. **`.env`** - 配置 API 密钥
   - `DEEPSEEK_API_KEY`: DeepSeek API 密钥（必需）

2. **`data/` 目录** - 放置要处理的 PDF 文件
   - `pdf2kg_batch.ipynb` 会自动批量处理该目录下的所有 PDF 文件

### 项目结构

```
PDF2KG4LLM/
├── pdf2kg_batch.ipynb       # 批量处理流程（从这里开始）
├── src/                      # 核心代码模块
│   ├── pdf_parser.py        # PDF 解析和文本分块
│   ├── kg_builder.py        # 知识图谱构建（多线程+缓存）
│   ├── visualizer.py        # 图谱可视化
│   └── neo4j_storage.py     # Neo4j 存储
├── data/                     # 放置 PDF 文件（批量处理）
├── output/                   # 输出结果
│   ├── kg_batch.json        # 知识图谱数据
│   └── kg_batch.png         # 可视化图片
├── .env                      # 环境变量配置（需创建）
├── .env.example             # 环境变量模板
└── pyproject.toml           # 项目依赖

```

## 处理流程

1. **批量 PDF 解析** (`src/pdf_parser.py`)
   - 自动扫描 `data/` 目录下所有 PDF 文件
   - 提取并合并所有文本内容
   - 将长文本分块（默认 2000 字符/块，200 字符重叠）

2. **知识图谱构建** (`src/kg_builder.py`)
   - 多线程并发处理（默认 20 个线程，5倍速度提升）
   - 使用 DeepSeek API 从文本块提取实体和关系
   - 磁盘缓存机制（重复运行秒级响应）
   - 自动合并所有文本块的知识图谱

3. **可视化** (`src/visualizer.py`)
   - 使用 NetworkX 生成知识图谱可视化
   - 支持中文显示
   - 智能节点筛选（显示前 100 个重要节点）

4. **存储**
   - JSON 格式：`output/kg_batch.json`
   - Neo4j 数据库：自动存储并提供查询接口

## 技术栈

- **Python 3.12+** - 编程语言
- **uv** - 包管理器
- **DeepSeek API** - 实体和关系提取
- **NetworkX** - 图谱可视化
- **Neo4j** - 知识图谱存储（可选）
- **PyMuPDF** - PDF 解析
- **Jupyter** - 交互式开发环境

## 注意事项

- **批量处理**: 将所有 PDF 文件放入 `data/` 目录，自动批量处理
- **API 配额**: DeepSeek API 会根据文本块数量多次调用，注意 API 使用量
- **多线程加速**: 默认 20 个并发线程，可在 `pdf2kg_batch.ipynb` 中调整 `max_workers`
- **缓存机制**: 处理过的文本块会缓存到 `.cache/` 目录，重复运行更快
- **中文支持**: 可视化已配置中文字体，如有问题请修改 `src/visualizer.py`
- **Neo4j 自动化**: notebook 会自动启动 Neo4j Docker 容器，无需手动配置

## 开发规范

本项目遵循以下开发要求，确保代码清晰易懂：

1. **代码简洁性**
   - 所有任务需要代码最简单，清楚地体现出管线流程
   - 避免过度封装，优先可读性

2. **环境管理**
   - 统一使用 `uv` 进行包管理
   - 所有依赖在 `pyproject.toml` 中声明

3. **流程可视化**
   - 使用 Jupyter Notebook 清晰展示数据处理流程
   - 每个处理步骤分块编写，便于理解和调试

4. **文件管理**
   - 良好的文件组织和命名规范
   - 模块化代码放在 `src/` 目录
   - 数据文件放在 `data/` 目录
   - 输出结果放在 `output/` 目录

5. **代码注释**
   - 所有代码使用中文注释
   - 清楚说明每个步骤在做什么
   - 关键逻辑必须有注释说明

## 故障排除

详见 [README_USAGE.md](README_USAGE.md) 的故障排除章节。

## 版本

当前版本：V0 - 基础 PDF2KG 功能