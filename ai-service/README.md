# AI Document Processing Service (Python / FastAPI)

Production microservice for parsing, extracting, and analyzing resume documents (PDF & DOCX) for the Placement Readiness Copilot.

## Architecture

- **FastAPI**: Asynchronous high-performance REST API.
- **PyMuPDF (`fitz`)**: Fast PDF text extraction, page-count validation, block geometry, and visual layout anomaly detection (scanned document detection, text overlap).
- **python-docx**: DOCX structured extraction (paragraphs, tables, runs).
- **Pydantic v2**: Strict response schema validation and type safety.

## Setup & Running

```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server on port 8000
python -m app.main
# Or with uvicorn directly:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Tests

```bash
.venv/bin/pytest
```

## API Endpoints

- `GET /health`: Healthcheck endpoint.
- `POST /parse-resume`: Multipart form-data upload (`file`). Returns parsed sections (contact, education, experience, projects, skills, achievements, links) and layout metadata.
