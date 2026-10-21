# System Architecture & Design Specification
## Placement Readiness Copilot

---

## 1. Executive Summary

**Placement Readiness Copilot** is a production-engineered multi-tier web application designed to evaluate, guide, benchmark, and elevate student software engineering placement readiness. The platform replaces superficial advice with deterministic benchmarks, verified evidence (PyMuPDF document ASTs, GitHub REST v3 activity, Playwright headless browser rendering), adaptive mock interview simulations, explainable job matching, and real-time application tracking.

---

## 2. System Architecture Diagram

```text
[ React 18 SPA (Vite + Nginx) ]
             │
      (HTTPS / JSON)
             ▼
[ Express.js API Gateway (Port 5001) ]
  ├── Security: Helmet, CORS, RateLimiter (authLimiter, apiLimiter)
  ├── Authentication: JWT Bearer Tokens, Bcrypt (Work Factor 10), Role RBAC
  ├── Controllers & Validators: Zod Schemas
  │
  ├──> [ Resume Intelligence Service ] ──> [ Python Document Service (FastAPI:8000) ]
  │                                           ├── PyMuPDF & python-docx extraction
  │                                           └── Playwright Headless Browser (SSRF Hardened)
  │
  ├──> [ GitHub Intelligence Service ] ──> GitHub REST API v3
  │
  ├──> [ Placement Readiness Engine ]
  │      └── 7-Factor Weighted Scorer (Provisional vs Final normalization)
  │
  ├──> [ AI Mock Interview Engine ] ──> Multi-Provider Abstraction
  │                                      ├── RuleOnlyProvider (Offline deterministic)
  │                                      ├── OllamaProvider (Local inference: Llama3/Mistral)
  │                                      └── GeminiProvider (Google Gemini API)
  │
  ├──> [ Job Source & Matching Engine ]
  │      ├── MSOT Admin Postings
  │      ├── Greenhouse Public Job Board API
  │      └── Lever Public Postings API
  │
  └──> [ Application Tracker (ATS) ] ──> Status Audit Trail
             │
             ▼
[ MongoDB Database (Mongoose ODM) ]
  ├── Users & Candidate Profiles
  ├── Resumes & GridFS Storage
  ├── ResumeReviews & Benchmark Findings
  ├── ProjectAnalyses & Viewport Screenshots
  ├── GitHubReviews & Commit Distribution
  ├── InterviewSessions & Transcripts
  ├── ReadinessAssessments & Snapshot History
  ├── Jobs (External & MSOT Drives)
  └── Applications & Status Histories
```

---

## 3. Core Component Design

### 3.1. Authentication & Role-Based Access Control (RBAC)
- **Token Format**: Signed JSON Web Tokens (`JWT_SECRET`, RS256/HS256 compliant), with `{ id, role }` claims and 7-day expiration.
- **Passwords**: Hashed with `bcryptjs` using a salt work factor of 10.
- **Role Isolation**:
  - `student`: Standard candidate access. Can view and mutate only their own profile, resumes, reviews, interviews, and application tracker records.
  - `admin`: University placement officer / MSOT administrator. Granted access to create, publish, edit campus drives, inspect candidate applicant rosters, and advance candidate hiring statuses.
  - **Administrative Protection**: Public registration with `role: "admin"` is strictly blocked unless the request supplies the server-side `ADMIN_REGISTRATION_SECRET` token (`msot_admin_secret_placement_copilot_2026`).

### 3.2. Data Privacy & GDPR Cascade Deletion
- Students retain unconditional ownership of their data.
- Executing `DELETE /api/profile` performs an atomic cascade deletion across 8 distinct models:
  1. `Profile`
  2. `Resume` metadata and physical storage files/GridFS chunks
  3. `ResumeReview`
  4. `ProjectAnalysis` and Playwright viewport screenshots
  5. `GitHubReview`
  6. `ReadinessAssessment`
  7. `InterviewSession`
  8. `Application` (student's tracker entries)
- Shared data integrity: Deleting a student profile **never** alters shared MSOT `Job` postings or other students' applications.

### 3.3. Multi-Provider AI Abstraction
Located in `server/services/ai/`:
- **`AIReviewProvider.js`**: Abstract base class declaring the standard contract:
  - `reviewResume({ parsedResume, checks, score })`
  - `generateInterviewQuestions({ targetRole, skills, projects, durationMinutes, focus })`
  - `evaluateInterview({ targetRole, focus, questions, transcript })`
- **`RuleOnlyProvider.js`**: 100% offline, deterministic engine producing actionable fixes and 5-dimension rubric scores without calling any remote APIs.
- **`OllamaProvider.js`**: Local LLM provider communicating with Ollama REST API (`/api/generate` with JSON format constraint) over `http://localhost:11434`. Automatically detects connectivity failure and safely falls back to `RuleOnlyProvider`.
- **`GeminiProvider.js`**: Production cloud LLM provider using `@google/generative-ai` with structured JSON output enforcement.

### 3.4. Job Source Ingestion & Deduplication
- **Permitted Sources Only**:
  - MSOT Admin Listings: Manually entered campus placements.
  - Greenhouse Public Board API: Ingestion via `https://boards-api.greenhouse.io/v1/boards/{board}/jobs`.
  - Lever Public Postings API: Ingestion via `https://api.lever.co/v0/postings/{company}?mode=json`.
- **Deduplication Strategy**: Normalized canonical URL hashing with fallback on composite key `(company.toLowerCase() + '::' + title.toLowerCase() + '::' + location.toLowerCase())`.
- **Compliance**: No unrestricted scrapers, no headless browser automation of third-party job forms, no credential hijacking.

### 3.5. Deterministic 5-Factor Job Matching Engine
Calculates explainable candidate-job compatibility:
1. **Skill Match (50%)**: Normalized Jaccard similarity of extracted candidate skills against required and preferred job skills.
2. **Target Role Match (25%)**: Token overlap between candidate `targetRole` and job title.
3. **Location & Workplace Match (10%)**: Geographic proximity and workplace type alignment (Remote = 100%, Hybrid = 50%).
4. **Experience Level Match (10%)**: Candidate graduation year and stated seniority vs. job requirements.
5. **Recency Match (5%)**: Decay score based on verified job publication timestamp.

### 3.6. Storage Layer Architecture
- **Metadata**: Stored in MongoDB with indexed compound keys.
- **Binary Documents & Screenshots**: Managed via `StorageProvider` abstraction (`server/services/storage/`).
  - Supports MongoDB GridFS (default) with streaming chunk reads and checksum verification.
  - Supports Local filesystem storage with UUID name sanitization.

---

## 4. Security & Hardening Architecture

1. **SSRF Mitigation**: Python Playwright live checker restricts URLs to public HTTP/HTTPS destinations, intercepting redirects and resolving DNS against loopback (`127.0.0.0/8`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata IP (`169.254.169.254`).
2. **Secret Scanning**: Heuristic scanner identifies potential AWS access keys, GitHub tokens, database URIs, and unignored `.env` files. Unmasked secrets are never logged or stored.
3. **HTTP Hardening**: Helmet sets CSP, HSTS, X-Content-Type-Options, and frameguard headers.
4. **Rate Limiting**: `express-rate-limit` protects authentication endpoints (30 req / 15 min) and API endpoints (300 req / 15 min).
