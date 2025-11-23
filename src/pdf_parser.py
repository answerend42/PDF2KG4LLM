"""
PDF 解析模块
功能：从 PDF 文件中提取文本内容，支持单个或批量处理
"""

from pypdf import PdfReader
from pathlib import Path


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    从 PDF 文件中提取所有文本

    参数:
        pdf_path: PDF 文件路径

    返回:
        提取的文本内容
    """
    reader = PdfReader(pdf_path)
    text = ""

    for page in reader.pages:
        text += page.extract_text() + "\n"

    return text.strip()


def extract_text_from_pdfs(pdf_dir: str) -> dict[str, str]:
    """
    批量从多个 PDF 文件中提取文本

    参数:
        pdf_dir: PDF 文件所在目录

    返回:
        字典，键为文件名，值为提取的文本
    """
    pdf_dir = Path(pdf_dir)
    results = {}

    for pdf_file in pdf_dir.glob("*.pdf"):
        print(f"处理: {pdf_file.name}")
        results[pdf_file.name] = extract_text_from_pdf(str(pdf_file))

    return results


def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> list[str]:
    """
    将长文本分块处理

    参数:
        text: 输入文本
        chunk_size: 每块的字符数
        overlap: 块之间的重叠字符数

    返回:
        文本块列表
    """
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap

    return chunks
