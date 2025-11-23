# PDF2KG4LLM 使用说明

## 快速开始

### 1. 安装依赖

```bash
# 使用 uv 安装依赖
uv sync
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填入你的 API 密钥：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 DeepSeek API Key：

```
DEEPSEEK_API_KEY=your_actual_api_key
```

### 3. 准备 PDF 文件

将你的 PDF 文件放到 `data/` 目录下：

```bash
mkdir -p data
# 将你的 PDF 文件复制到 data/ 目录
```

### 4. 运行 Notebook

启动 Jupyter：

```bash
jupyter notebook pdf2kg_pipeline.ipynb
```

或使用 JupyterLab：

```bash
jupyter lab pdf2kg_pipeline.ipynb
```

在 notebook 中：
1. 修改 `pdf_path` 变量为你的 PDF 文件路径
2. 按顺序执行所有单元格

### 5. 查看结果

- **JSON 数据**: `output/knowledge_graph.json`
- **可视化图片**: `output/knowledge_graph.png`

## 项目结构

```
PDF2KG4LLM/
├── src/                      # 核心代码模块
│   ├── pdf_parser.py        # PDF 解析和文本分块
│   ├── kg_builder.py        # 知识图谱构建
│   ├── visualizer.py        # 图谱可视化
│   └── neo4j_storage.py     # Neo4j 存储（可选）
├── data/                     # PDF 文件存放目录
├── output/                   # 输出结果目录
├── pdf2kg_pipeline.ipynb    # 主处理流程 notebook
├── pyproject.toml           # 项目依赖配置
├── .env.example             # 环境变量示例
└── README.md                # 项目说明

```

## 模块说明

### pdf_parser.py
- `extract_text_from_pdf()`: 从 PDF 提取文本
- `chunk_text()`: 将长文本分块

### kg_builder.py
- `KGBuilder`: 使用 DeepSeek API 构建知识图谱
- `extract_entities_and_relations()`: 提取实体和关系
- `build_kg_from_chunks()`: 从多个文本块构建完整图谱

### visualizer.py
- `KGVisualizer`: 使用 NetworkX 可视化知识图谱
- `build_graph()`: 构建图结构
- `visualize()`: 生成可视化图片
- `get_stats()`: 获取图谱统计信息

### neo4j_storage.py (可选)
- `Neo4jStorage`: 将知识图谱存储到 Neo4j 数据库
- 需要配置 Neo4j 连接信息

## 注意事项

1. **API 调用**: DeepSeek API 会根据文本块数量进行多次调用，请注意 API 配额
2. **文本分块**: 默认每块 2000 字符，可根据需要调整
3. **中文支持**: 可视化模块已配置中文字体支持
4. **Neo4j**: Neo4j 存储是可选功能，不使用不影响基本流程

## 故障排除

### 中文显示问题
如果可视化图片中文显示为方框，修改 `src/visualizer.py` 中的字体设置。

### API 错误
确保 `.env` 文件中的 `DEEPSEEK_API_KEY` 正确配置。

### 依赖安装问题
使用 `uv sync` 重新安装依赖。
