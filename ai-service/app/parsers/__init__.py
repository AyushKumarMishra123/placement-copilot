# app/parsers/__init__.py
from .pdf_parser import parse_pdf_document
from .docx_parser import parse_docx_document

__all__ = ["parse_pdf_document", "parse_docx_document"]
