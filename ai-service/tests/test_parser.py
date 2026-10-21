import io
import pytest
from fastapi.testclient import TestClient
import fitz
import docx

from app.main import app

client = TestClient(app)

def create_sample_pdf(text_content: str, num_pages: int = 1) -> bytes:
    doc = fitz.open()
    for _ in range(num_pages):
        page = doc.new_page()
        page.insert_text((50, 72), text_content)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes

def create_sample_docx(text_content: str) -> bytes:
    doc = docx.Document()
    for line in text_content.split("\n"):
        doc.add_paragraph(line)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-service"

def test_parse_empty_file():
    response = client.post(
        "/parse-resume",
        files={"file": ("empty.pdf", b"", "application/pdf")}
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["errorCode"] == "EMPTY_DOCUMENT"

def test_parse_unsupported_file():
    response = client.post(
        "/parse-resume",
        files={"file": ("resume.txt", b"plain text resume", "text/plain")}
    )
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["errorCode"] == "UNSUPPORTED_DOCUMENT"

def test_parse_malformed_pdf():
    response = client.post(
        "/parse-resume",
        files={"file": ("corrupt.pdf", b"%PDF-1.4 garbage corrupt content not a real pdf", "application/pdf")}
    )
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["errorCode"] == "MALFORMED_PDF"

def test_parse_valid_pdf_resume():
    sample_resume = """Alex Kumar
Email: alex.kumar@example.com | Phone: +91 9876543210
GitHub: https://github.com/alexkumar | LinkedIn: https://linkedin.com/in/alexkumar | LeetCode: https://leetcode.com/alexkumar

EDUCATION
National Institute of Technology
B.Tech in Computer Science and Engineering (2020 - 2024)
CGPA: 8.8/10

TECHNICAL SKILLS
Languages: Python, JavaScript, TypeScript, C++, SQL
Frameworks: React, Node.js, Express.js, FastAPI
Databases: MongoDB, PostgreSQL, Redis
Cloud & Tools: Docker, Git, AWS, Postman

PROJECTS
Placement Copilot | React, Node.js, MongoDB
- Developed full-stack placement readiness platform supporting 500+ student profiles.
- Integrated automated benchmark checks improving resume ATS pass rate by 35%.
- GitHub: https://github.com/alexkumar/placement-copilot

ACHIEVEMENTS
- Winner, Smart India Hackathon 2023 with first place national prize.
- Solved 450+ data structures problems on LeetCode with top 10% contest rating.
"""
    pdf_bytes = create_sample_pdf(sample_resume, num_pages=1)
    
    response = client.post(
        "/parse-resume",
        files={"file": ("alex_resume.pdf", pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["pageCount"] == 1
    assert data["fileType"] == "pdf"
    assert data["sections"]["contact"]["email"] == "alex.kumar@example.com"
    assert data["sections"]["contact"]["github"] == "https://github.com/alexkumar"
    assert len(data["sections"]["skills"]["languages"]) >= 3
    assert len(data["sections"]["projects"]) >= 1
    assert "500+" in data["sections"]["projects"][0]["impact"] or "35%" in data["sections"]["projects"][0]["impact"]

def test_parse_valid_docx_resume():
    sample_resume = """Priya Sharma
Email: priya.sharma@example.com | Phone: 9876501234
GitHub: https://github.com/priyasharma

EDUCATION
Delhi Technological University
B.Tech Information Technology, 2025
CGPA: 9.1

PROJECTS
E-Commerce Microservices | Go, Docker, PostgreSQL
- Built cloud-native order processing service handling 2000 req/s.
- Reduced latency by 40ms using Redis caching.
- GitHub: https://github.com/priyasharma/order-service

TECHNICAL SKILLS
Languages: Go, Python, JavaScript
Databases: PostgreSQL, Redis
Tools: Docker, Git, Kubernetes
"""
    docx_bytes = create_sample_docx(sample_resume)
    response = client.post(
        "/parse-resume",
        files={"file": ("priya_resume.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["fileType"] == "docx"
    assert data["sections"]["contact"]["email"] == "priya.sharma@example.com"
    assert len(data["sections"]["projects"]) >= 1
