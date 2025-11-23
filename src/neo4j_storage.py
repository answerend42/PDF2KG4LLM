"""
Neo4j 存储模块
功能：将知识图谱存储到 Neo4j 数据库
"""

from neo4j import GraphDatabase
from typing import Dict
import os


class Neo4jStorage:
    """Neo4j 知识图谱存储器"""

    def __init__(self, uri: str = None, user: str = None, password: str = None):
        """
        初始化 Neo4j 连接

        参数:
            uri: Neo4j 数据库 URI
            user: 用户名
            password: 密码
        """
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "password")
        self.driver = None

    def connect(self):
        """连接到 Neo4j 数据库"""
        self.driver = GraphDatabase.driver(self.uri, auth=(self.user, self.password))
        print(f"已连接到 Neo4j: {self.uri}")

    def close(self):
        """关闭数据库连接"""
        if self.driver:
            self.driver.close()
            print("Neo4j 连接已关闭")

    def clear_database(self):
        """清空数据库"""
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
            print("数据库已清空")

    def store_kg(self, kg_data: Dict):
        """
        将知识图谱存储到 Neo4j

        参数:
            kg_data: 包含实体和关系的知识图谱数据
        """
        with self.driver.session() as session:
            # 创建实体节点
            for entity in kg_data.get("entities", []):
                session.run(
                    """
                    MERGE (n:Entity {id: $id})
                    SET n.type = $type, n.properties = $properties
                    """,
                    id=entity["id"],
                    type=entity.get("type", "unknown"),
                    properties=str(entity.get("properties", {}))
                )

            # 创建关系
            for relation in kg_data.get("relations", []):
                session.run(
                    """
                    MATCH (a:Entity {id: $source})
                    MATCH (b:Entity {id: $target})
                    MERGE (a)-[r:RELATION {type: $type}]->(b)
                    """,
                    source=relation["source"],
                    target=relation["target"],
                    type=relation.get("type", "related")
                )

            print(f"已存储 {len(kg_data.get('entities', []))} 个实体和 {len(kg_data.get('relations', []))} 个关系")

    def __enter__(self):
        """上下文管理器入口"""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """上下文管理器退出"""
        self.close()
