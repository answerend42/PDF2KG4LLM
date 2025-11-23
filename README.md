# PDF2KG4LLM

技术栈：

- Ollama
  - Deepseek-r1:1.5b 用于最后的推理

- DeepSeek-V3.2-Exp 用于 KG 的构建
  - 提供官方的 api、token
- Langchain 或者别的什么框架来支持 GraphRAG
- NetworkX 可视化
- Neo4j 知识图谱存储
- etc.

任务：

- [ ] 完成 PDF -> KG 的构建，获取可视化的知识图谱



要求：

1. 所有的任务需要代码最简单，清楚的体现出管线
2. 环境管理使用 uv
3. 可以分块来写构建的每一个过程，用一个 ipynb 来比较清楚的体现数据处理流程
4. 良好的文件管理和命名
5. 中文注释，写清楚在干什么