# 如果遇到 TypeError: unexpected keyword argument

这是因为 Jupyter notebook 缓存了旧版本的模块。

## 解决方法

### 方法 1: 重启 Kernel（推荐）
在 Jupyter 中：
- 点击菜单 `Kernel` → `Restart Kernel`
- 然后重新运行所有 cell

### 方法 2: 强制重新加载模块
在 notebook 第一个 cell 添加：

```python
# 强制重新加载模块
import sys
import importlib

# 删除已加载的模块
for module in list(sys.modules.keys()):
    if module.startswith('src.'):
        del sys.modules[module]

# 然后正常导入
from src.pdf_parser import extract_text_from_pdfs, chunk_text
from src.kg_builder import KGBuilder
from src.visualizer import KGVisualizer
```

### 方法 3: 使用 autoreload（最佳实践）
在 notebook 最开始添加：

```python
%load_ext autoreload
%autoreload 2
```

这样每次运行 cell 时都会自动重新加载修改过的模块。
