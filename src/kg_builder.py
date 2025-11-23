"""
知识图谱构建模块
功能：使用 DeepSeek API 从文本中提取实体和关系，支持多线程和缓存
"""

import os
import json
import hashlib
from openai import OpenAI
from typing import List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed
from diskcache import Cache
from tqdm import tqdm


class KGBuilder:
    """知识图谱构建器（支持多线程和缓存）"""

    def __init__(self, api_key: str = None, base_url: str = "https://api.deepseek.com",
                 cache_dir: str = ".cache", max_workers: int = 5):
        """
        初始化 KG 构建器

        参数:
            api_key: DeepSeek API 密钥
            base_url: API 基础 URL
            cache_dir: 缓存目录
            max_workers: 最大并发线程数
        """
        self.client = OpenAI(
            api_key=api_key or os.getenv("DEEPSEEK_API_KEY"),
            base_url=base_url
        )
        self.cache = Cache(cache_dir)
        self.max_workers = max_workers

    def _get_cache_key(self, text: str) -> str:
        """生成文本的缓存键"""
        return hashlib.md5(text.encode()).hexdigest()

    def extract_entities_and_relations(self, text: str) -> Dict:
        """
        从文本中提取实体和关系（带缓存，失败不缓存）

        参数:
            text: 输入文本

        返回:
            包含实体和关系的字典
        """
        # 检查缓存
        cache_key = self._get_cache_key(text)
        if cache_key in self.cache:
            return self.cache[cache_key]

        # 使用 JSON Output 功能
        system_prompt = """从文本中提取知识图谱的实体和关系。

输出 JSON 格式：
{
    "entities": [
        {"id": "实体名", "type": "类型", "properties": {}}
    ],
    "relations": [
        {"source": "实体1", "target": "实体2", "type": "关系类型"}
    ]
}"""

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )

        result = json.loads(response.choices[0].message.content)

        # 只缓存成功的结果
        self.cache[cache_key] = result
        return result

    def build_kg_from_chunks(self, chunks: List[str]) -> Dict:
        """
        从多个文本块构建完整的知识图谱（多线程处理）

        参数:
            chunks: 文本块列表

        返回:
            合并后的知识图谱
        """
        all_entities = {}
        all_relations = []

        # 多线程处理，带进度条
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.extract_entities_and_relations, chunk): i
                      for i, chunk in enumerate(chunks)}

            with tqdm(total=len(chunks), desc="构建知识图谱", unit="块") as pbar:
                for future in as_completed(futures):
                    i = futures[future]
                    try:
                        kg = future.result()

                        # 合并实体
                        for entity in kg.get("entities", []):
                            entity_id = entity["id"]
                            if entity_id not in all_entities:
                                all_entities[entity_id] = entity

                        # 添加关系
                        all_relations.extend(kg.get("relations", []))

                        pbar.set_postfix({"实体": len(all_entities), "关系": len(all_relations)})

                    except Exception as e:
                        pbar.write(f"✗ 块 {i+1} 出错: {e}")

                    pbar.update(1)

        return {
            "entities": list(all_entities.values()),
            "relations": all_relations
        }
