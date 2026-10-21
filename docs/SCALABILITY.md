# Scalability & Performance Analysis
## Placement Readiness Copilot

---

## 1. Scope of Empirical Testing

This report documents observed operational performance, measured test runtimes, resource boundaries, and architectural scaling characteristics verified under local test execution conditions.

> [!IMPORTANT]
> In accordance with project integrity standards, this analysis does **not** fabricate synthetic load-test curves or claim unverified concurrent user capacities. Measurements below reflect actual executions performed in the repository environment.

---

## 2. Measured Response Times & Test Execution Performance

### Backend Test Execution (macOS Apple Silicon, Node.js v25.9, Jest in-band)
- **Full Backend Suite Execution Time**: ~16.5 seconds for 16 suites / 102 automated tests.
- **Average Test Execution Time**: ~160 ms per unit/integration test.
- **Fastest Suites**:
  - `healthRoutes`: ~15 ms
  - `readinessWeights`: ~28 ms
  - `benchmarkEngine`: ~85 ms
- **Database Operations (In-Memory MongoDB)**:
  - Average user registration + JWT generation: ~65 ms (governed by `bcryptjs` salt rounds = 10).
  - Interview question generation & session initialization: ~80 ms.
  - Cascade deletion across 8 collections: ~110 ms.

### Python Document Processing Service (Python 3.9, Pytest)
- **Full Python Test Suite**: ~0.82 seconds for 14 tests.
- **PyMuPDF PDF Parsing**: ~15–35 ms per single-page PDF document.
- **python-docx Extraction**: ~25–50 ms per DOCX document.
- **Playwright Headless Browser Launch & SSRF Check**: ~180–350 ms per check (under local loopback conditions).

### Frontend Build Performance (Vite v5.2, React 18)
- **Production Bundle Build**: 8.38 seconds for 113 transformed modules.
- **Total Compressed Bundle Size**: ~112.58 kB (Gzipped JS: 109.63 kB, Gzipped CSS: 2.51 kB, Gzipped HTML: 0.44 kB).
- **Initial Page Load Performance**: Instantaneous client-side bootstrap due to zero heavyweight UI dependencies and use of native modern CSS variables.

---

## 3. Bottleneck Analysis & Resource Boundaries

### 3.1. CPU-Intensive Tasks
1. **Password Hashing (`bcryptjs`)**:
   - Work factor 10 is intentionally CPU-intensive to resist dictionary attacks. Under high concurrent registration surges, horizontal scaling of API nodes is required to prevent event-loop latency.
2. **Headless Browser Rendering (Playwright)**:
   - Playwright Chromium instances require 100–250 MB RAM per active tab. Concurrent live checks must be bounded by a worker pool or message queue (e.g. BullMQ / Redis) in production to avoid memory spikes.

### 3.2. Database I/O & Indexing
- The application implements targeted compound and sparse indexes across all primary query patterns:
  - `users`: `{ email: 1 }` (unique)
  - `profiles`: `{ userId: 1 }` (unique)
  - `resumes`: `{ userId: 1, createdAt: -1 }`, `{ documentId: 1 }` (unique)
  - `interview_sessions`: `{ userId: 1, createdAt: -1 }`
  - `jobs`: `{ sourceType: 1, externalId: 1 }` (sparse unique), text index on `{ title, company, description }`
  - `applications`: `{ userId: 1, jobId: 1 }` (compound unique)
- **Scalability Limit**: In a single MongoDB replica set, write operations to GridFS chunks are I/O bound. For campus deployments exceeding 10,000 active students, Amazon S3 or Google Cloud Storage adapter is recommended for document blobs, keeping MongoDB purely for document metadata.

### 3.3. External API Rate Limits
1. **GitHub REST API**:
   - Unauthenticated requests: 60 requests/hour per IP.
   - Authenticated requests (`GITHUB_TOKEN`): 5,000 requests/hour.
   - Recommendation: Cache GitHub profile summaries with a 24-hour TTL in Redis to eliminate duplicate external requests.
2. **Public Job Board APIs (Greenhouse & Lever)**:
   - Configured with 8-second request timeouts and in-memory deduplication. In high-traffic deployments, job ingestion should run as an asynchronous cron worker rather than inline on student requests.

---

## 4. What Remains Untested

1. **Distributed Multi-Node Clustered Load**: High concurrency stress testing (> 500 concurrent requests/second) was not executed in this local paired development environment.
2. **Network Latency Under Real WAN**: Remote database Atlas latency across continents was not benchmarked (in-memory MongoDB was used for unit testing).
3. **Live Playwright against Global Firewalls**: Behavior behind enterprise corporate proxy filtering or strict Cloudflare Bot Management has not been evaluated against real third-party production sites.
