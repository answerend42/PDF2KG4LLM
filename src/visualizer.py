"""
知识图谱可视化模块
功能：使用 NetworkX 可视化，Neo4j 存储
"""

from typing import Dict
import networkx as nx
import matplotlib.pyplot as plt
import warnings

warnings.filterwarnings('ignore', category=UserWarning)
plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False


class KGVisualizer:
    """知识图谱可视化器"""

    def __init__(self):
        """初始化可视化器"""
        self.kg_data = None
        self.graph = nx.DiGraph()

    def build_graph(self, kg_data: Dict):
        """
        构建图谱

        参数:
            kg_data: 包含实体和关系的知识图谱数据
        """
        self.kg_data = kg_data

        # 添加节点
        for entity in kg_data.get("entities", []):
            self.graph.add_node(entity["id"], type=entity.get("type", "unknown"))

        # 添加边
        for relation in kg_data.get("relations", []):
            if relation["source"] in self.graph and relation["target"] in self.graph:
                self.graph.add_edge(
                    relation["source"],
                    relation["target"],
                    type=relation.get("type", "related")
                )

    def visualize(self, output_path: str = "output/kg.png", max_nodes: int = 100):
        """
        使用 NetworkX 可视化

        参数:
            output_path: 输出图片路径
            max_nodes: 最多显示的节点数
        """
        if self.graph.number_of_nodes() == 0:
            print("图谱为空")
            return

        # 筛选重要节点
        if self.graph.number_of_nodes() > max_nodes:
            degrees = dict(self.graph.degree())
            top_nodes = sorted(degrees.items(), key=lambda x: x[1], reverse=True)[:max_nodes]
            graph = self.graph.subgraph([n for n, _ in top_nodes])
            print(f"只显示前 {max_nodes} 个重要节点")
        else:
            graph = self.graph

        plt.figure(figsize=(20, 15))

        # 布局
        pos = nx.spring_layout(graph, k=2, iterations=50, seed=42)

        # 节点大小
        degrees = dict(graph.degree())
        node_sizes = [300 + degrees.get(n, 0) * 100 for n in graph.nodes()]

        # 绘制
        nx.draw_networkx_nodes(graph, pos, node_color='lightblue', node_size=node_sizes, alpha=0.8)
        nx.draw_networkx_edges(graph, pos, edge_color='gray', arrows=True, alpha=0.4, width=1.5)
        nx.draw_networkx_labels(graph, pos, font_size=8)

        # 边标签
        edge_labels = nx.get_edge_attributes(graph, 'type')
        nx.draw_networkx_edge_labels(graph, pos, edge_labels, font_size=6, font_color='red')

        plt.title(f"知识图谱 ({graph.number_of_nodes()} 节点, {graph.number_of_edges()} 边)", fontsize=14)
        plt.axis('off')
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight', facecolor='white')
        plt.close()

        print(f"✓ 图谱已保存: {output_path}")

    def store_to_neo4j(self, neo4j_uri: str = None, neo4j_user: str = None, neo4j_password: str = None):
        """
        存储到 Neo4j

        参数:
            neo4j_uri: Neo4j URI
            neo4j_user: Neo4j 用户名
            neo4j_password: Neo4j 密码
        """
        if not self.kg_data:
            print("图谱为空")
            return

        from src.neo4j_storage import Neo4jStorage
        import os

        uri = neo4j_uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = neo4j_user or os.getenv("NEO4J_USER", "neo4j")
        password = neo4j_password or os.getenv("NEO4J_PASSWORD", "password123")

        with Neo4jStorage(uri=uri, user=user, password=password) as storage:
            storage.clear_database()
            storage.store_kg(self.kg_data)

        print("\n✓ 已存储到 Neo4j")
        print("  访问: http://localhost:7474")
        print("  查询: MATCH (n)-[r]->(m) RETURN n,r,m LIMIT 100")

    def get_stats(self) -> Dict:
        """获取统计信息"""
        if not self.kg_data:
            return {"节点数": 0, "边数": 0}

        return {
            "节点数": len(self.kg_data.get("entities", [])),
            "边数": len(self.kg_data.get("relations", []))
        }
