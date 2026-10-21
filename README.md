# Placement Readiness Copilot

A production-ready platform designed to empower engineering students to prepare, benchmark, and elevate their placement readiness with structured profile verification, resume audits, code analysis, and AI mock interview simulations.

---

## 1. Product Overview

The **Placement Readiness Copilot** bridges the gap between academic preparation and competitive campus hiring benchmarks.
Key milestones supported:
1. **User Identity & Security**: Role-based authentication (Student and Admin/MSOT placement cell) with secure session handling.
2. **Student Profile Ownership**: GDPR/privacy-conscious candidate profile containing skills, educational records, verified projects, and external profiles (GitHub, LinkedIn, LeetCode).
3. **Data Privacy & Erasure**: Full student data rights to view, edit, and permanently cascade delete all stored records.
4. **Document Ingestion Foundation**: Pre-screened PDF and DOCX document pipeline with filename sanitization and MIME verification for upcoming ATS analysis.
5. **Placement Readiness Dashboard**: Real-time progress metric tracking profile completeness and readiness module availability without mock/fake data.

---

## 2. Architecture Overview

```text
[ Browser / React SPA ]
        │
   (HTTPS / JWT)
        ▼
[ Express API Gateway ] ── (Helmet / CORS / Rate Limiter / Zod Validation)
        │
        ├──> [ Auth Controller & JWT Service ]
        ├──> [ Profile Management Controller ]
        ├──> [ Resume Document Upload & Storage ]
        │
        ▼
[ MongoDB Atlas (Mongoose ODM) ]
  ├── User Collection
  ├── Profile Collection
  └── Resume Metadata Collection
```

- **Client**: React 18 with Vite, React Router 6, and a centralized Axios client with automatic Bearer token injection and error interceptors.
- **Server**: Node.js & Express.js with modular routing, centralized error formatting, Zod schema validation, and strict rate limiting.
- **Storage**: Mongoose connected to MongoDB Atlas (or local MongoDB) storing structured user/profile models; isolated filesystem storage with unique document UUIDs for resumes.

---

## 3. Tech Stack

- **Frontend**: React 18, Vite, React Router DOM 6, Axios, Vanilla CSS design system (Plus Jakarta Sans).
- **Backend**: Node.js, Express.js, Mongoose, JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `zod`, `multer`, `helmet`, `cors`, `express-rate-limit`, `dotenv`.
- **Testing**: Jest, Supertest, `mongodb-memory-server` for zero-dependency isolated test runs.
- **Language**: JavaScript (ES6+ / CommonJS for backend, ESM for frontend).

---

## 4. Project Structure

```text
placement-copilot/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable UI (Navbar, ProtectedRoute, Alert)
│   │   ├── context/          # AuthContext for session management
│   │   ├── hooks/            # Custom hooks (useAuth)
│   │   ├── pages/            # Views (Login, Register, Dashboard, Profile)
│   │   ├── services/         # Centralized Axios API client
│   │   ├── styles/           # Modern SaaS CSS system
│   │   ├── App.jsx           # Application routes
│   │   └── main.jsx          # DOM entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── config/               # Database connection (db.js)
│   ├── controllers/          # Business logic (auth, profile, resume)
│   ├── middleware/           # Auth, error, rate-limiting, upload handlers
│   ├── models/               # Mongoose schemas (User, Profile, Resume)
│   ├── routes/               # API route definitions
│   ├── tests/                # Automated integration tests
│   ├── utils/                # JWT and standardized API response helpers
│   ├── validators/           # Zod schema definitions
│   ├── uploads/              # Local sanitized document storage
│   ├── app.js                # Express app configuration
│   ├── server.js             # HTTP listener and database startup
│   ├── .env.example
│   └── package.json
├── ai-service/               # Reserved for Days 2-8 processing pipeline
├── tests/                    # Top-level test documentation
├── .gitignore
├── README.md
└── package.json              # Root orchestration package
```

---

## 5. Environment Variables

Create `.env` in `server/` using `server/.env.example`:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Port for the Express server | `5001` (avoids macOS AirPlay port 5000 conflict) |
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `MONGODB_URI` | MongoDB Atlas or local MongoDB connection URI | `mongodb://127.0.0.1:27017/placement_copilot` |
| `JWT_SECRET` | Secret key for signing and verifying JWT tokens | `your_secure_random_jwt_secret` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `AI_PROVIDER` | AI provider for reviews and interviews (`rules_only`, `gemini`) | `rules_only` or `gemini` |
| `GEMINI_API_KEY` | Google Gemini API key if using `gemini` provider | `AIzaSy...` |
| `GEMINI_MODEL` | Gemini model name | `gemini-1.5-flash` |
| `ADMIN_REGISTRATION_SECRET` | Secret code required to register with `admin` role | `msot_admin_secret_placement_copilot_2026` |
| `SERPAPI_API_KEY` | SerpApi API key for live Google Jobs search (kept strictly server-side) | `your_serpapi_api_key_here` |
| `JOBS_DEFAULT_COUNTRY` | Default 2-letter country code for Google Jobs search | `in` |
| `JOBS_DEFAULT_LANGUAGE` | Default 2-letter language code for Google Jobs search | `en` |
| `JOBS_DEFAULT_LOCATION` | Default search location when unspecified | `Bengaluru, Karnataka, India` |
| `JOB_SOURCES_ENABLED` | Permitted external job board sources | `greenhouse,lever,serpapi` |

Client environment (`client/.env.local` optional):
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Base URL for API calls | `/api` (proxied by Vite) |

---

## 6. Local Setup & Installation

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- MongoDB instance (MongoDB Atlas connection string or local MongoDB on port 27017)

### Step 1: Install Backend Dependencies
```bash
cd server
npm install
```

### Step 2: Configure Environment Variables
```bash
cp .env.example .env
# Edit .env with your MONGODB_URI and JWT_SECRET
```

### Step 3: Install Frontend Dependencies
```bash
cd ../client
npm install
```

---

## 7. Running the Application

### Running Backend (Port 5000)
```bash
cd server
npm run dev
```
For production run:
```bash
npm start
```

### Running Frontend (Port 5173)
```bash
cd client
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 8. Running Automated Tests

Run backend integration tests verifying authentication, authorization, profile CRUD, tenant isolation, and resume upload validation:

```bash
cd server
npm test
```

Tests use `mongodb-memory-server` and run completely self-contained without needing an external database.

---

## 9. API Reference

### Health
- `GET /api/health`: Health status and timestamp check.

### Authentication
- `POST /api/auth/register`: Create account (`name`, `email`, `password`, `role`).
- `POST /api/auth/login`: Authenticate and receive JWT (`email`, `password`).
- `POST /api/auth/logout`: End session.
- `GET /api/auth/me`: Get current authenticated user details (Protected).

### Profile & Projects
- `GET /api/profile`: Retrieve candidate profile and project entries (Protected).
- `PUT /api/profile`: Create/update candidate profile and project entries (Protected).
- `DELETE /api/profile`: Reset profile attributes and cascade delete candidate records (Protected).
- `GET /api/profile/export`: Export all candidate personal records, reviews, transcripts, and applications as structured JSON (Protected).
- `DELETE /api/profile/account`: Permanently delete the user identity account and all personal documents (Protected).

### Documents & Resume Intelligence
- `POST /api/resumes`: Upload and validate PDF/DOCX resume file (Max 5MB) (Protected).
- `GET /api/resumes`: List user's uploaded resume records (Protected).
- `GET /api/resumes/:id`: Get single resume metadata and its latest review (Protected).
- `GET /api/resumes/:id/review`: Fetch deterministic benchmark review and AI action items (Protected).
- `GET /api/resumes/:id/reviews`: Fetch chronological review version history (Protected).
- `POST /api/resumes/:id/re-review`: Re-run benchmark review on existing resume (Protected).
- `DELETE /api/resumes/:id`: Permanently delete resume file and associated review history (Protected).

### GitHub Profile Intelligence
- `POST /api/github/analyze`: Trigger analysis for a public GitHub username (`username`) (Protected).
- `GET /api/github/reviews`: Fetch all historical GitHub profile reviews for the authenticated student (Protected).
- `GET /api/github/reviews/:reviewId`: Fetch specific GitHub profile review snapshot (Protected).

### Project & Source-Code Intelligence
- `GET /api/projects`: List all portfolio projects for the student (Protected).
- `POST /api/projects`: Add a new project (`name`, `description`, `techStack`, `githubUrl`, `liveUrl`) (Protected).
- `PUT /api/projects/:projectId`: Update an existing project (Protected).
- `DELETE /api/projects/:projectId`: Delete project and cascade clean associated reviews and screenshots (Protected).
- `POST /api/projects/:projectId/analyze`: Run bounded repository code review, README audit, secret scanning, and claim verification (Protected).
- `GET /api/projects/:projectId/analysis`: Retrieve latest analysis report for a project (Protected).
- `GET /api/projects/:projectId/analyses`: Retrieve complete iteration history for a project (Protected).
- `POST /api/projects/:projectId/check-live-link`: Trigger standalone Playwright headless browser check (Protected).
- `GET /api/projects/:projectId/screenshots/:screenshotId`: Stream authenticated GridFS viewport screenshot (Protected).

### Placement Readiness Scoring Engine
- `GET /api/readiness`: Retrieve latest readiness assessment or automatically recalculate if stale/missing (Protected).
- `POST /api/readiness/recalculate`: Force server-side recalculation of score from real persisted source data (Protected).
- `GET /api/readiness/history`: Retrieve chronological assessment history snapshots for student (Protected).
- `GET /api/readiness/:assessmentId`: Retrieve specific assessment snapshot with ownership verification (Protected).

### AI Mock Interview
- `POST /api/interviews`: Start or configure an interview (`targetRole`, `durationMinutes: 15 | 20`, `focus`) (Protected).
- `GET /api/interviews`: Retrieve list of all interview sessions for authenticated student (Protected).
- `GET /api/interviews/:id`: Retrieve active or past interview session with full transcript (Protected).
- `POST /api/interviews/:id/answer`: Submit student answer to the current question with server-side time tracking (Protected).
- `POST /api/interviews/:id/skip`: Skip the current question and proceed to next question (Protected).
- `POST /api/interviews/:id/next-question`: Request next question in the adaptive plan (Protected).
- `POST /api/interviews/:id/complete`: Manually finish interview session and mark for evaluation (Protected).
- `POST /api/interviews/:id/evaluate`: Trigger evidence-based 5-dimension evaluation of the transcript (Protected).

### Jobs, Google Jobs Search & Applications
- `GET /api/jobs/search`: Live Google Jobs search via SerpApi (`q`, `location`, `employmentType`, `workMode`, `nextPageToken`) with deterministic matching against student profile (Protected).
- `GET /api/jobs`: Filter and browse campus jobs (`search`, `targetRole`, `location`, `workplaceType`, `skills`, `sourceType`, `page`, `limit`) (Protected).
- `GET /api/jobs/recommended`: Fetch personalized job opportunities ranked by deterministic 5-factor matching algorithm (Protected).
- `GET /api/jobs/:id`: Retrieve single job listing with candidate-specific match breakdown (Protected).
- `POST /api/jobs/:id/save`: Save a job directly into the candidate's application tracker (Protected).
- `GET /api/applications`: Retrieve student's tracked applications with status summaries (Protected).
- `POST /api/applications`: Track a new application (`jobId`, `status`, `notes`, `followUpDate`, `jobData`) (Protected).
- `GET /api/applications/:id`: Retrieve single application with complete audit trail status history (Protected).
- `PATCH /api/applications/:id`: Update application status, notes, or follow-up date (Protected).
- `DELETE /api/applications/:id`: Remove a saved application tracker entry (Protected).

### Admin / MSOT Job Board
- `GET /api/admin/jobs`: List all MSOT/admin-managed campus postings with applicant counts (Admin Only).
- `POST /api/admin/jobs`: Create and publish a campus job posting (`title`, `company`, `requiredSkills`, etc.) (Admin Only).
- `GET /api/admin/jobs/:id`: Fetch MSOT job details with applicant roster (Admin Only).
- `PUT /api/admin/jobs/:id`: Update MSOT campus job posting (Admin Only).
- `PATCH /api/admin/jobs/:id/status`: Toggle job active/inactive status (Admin Only).
- `GET /api/admin/jobs/:id/applicants`: View student applicants and application timestamps for a job (Admin Only).
- `PATCH /api/admin/jobs/:id/applicants/:applicationId`: Update applicant status (`Shortlisted`, `Interview`, `Offer`, `Rejected`) (Admin Only).

---

## 10. Placement Readiness Scoring Methodology

### Official Scoring Weights
Centralized in `server/config/readinessWeights.js`:

| Assessment Component | Weight | Source Module |
| :--- | :---: | :--- |
| **Resume Quality** | 25% | Real PyMuPDF + 9 ATS deterministic benchmark checks (`ResumeReview`) |
| **Projects & Code** | 25% | Repository structure, README audit, secrets scan, Playwright live check (`ProjectAnalysis`) |
| **Mock Interview** | 20% | Technical, system design, and behavioral simulation evaluated with 5-dimension rubric |
| **GitHub Profile** | 10% | Profile README, bio, pinned work, 90-day commit activity (`GitHubReview`) |
| **Coding Practice** | 10% | Verified DSA problem volume and contest performance (Scheduled) |
| **LinkedIn Profile** | 5% | Professional narrative, skills alignment, and recommendation presence (Scheduled) |
| **Achievements** | 5% | Confirmed hackathons, engineering certifications, awards, technical clubs (`Profile`) |
| **Total** | **100%** | Validated to sum to exactly 100 on server startup |

### Provisional vs. Final Score Formulas

1. **Provisional Readiness Score**:
   When not all 7 components have valid assessments, the score is calculated strictly from assessed components and normalized by their combined weight:
   $$\text{Provisional Score} = \frac{\sum (\text{Component Score} \times \text{Component Weight})}{\sum \text{Weights of Assessed Components}}$$
   *Unassessed components are never penalized as zero.* Coverage percentage reflects $\frac{\sum \text{Weights of Assessed Components}}{100} \times 100\%$.

2. **Final Placement Readiness Score**:
   Available only when all 7 components are assessed and current ($100\%$ coverage):
   $$\text{Final Score} = \sum (\text{Component Score} \times \frac{\text{Component Weight}}{100})$$

### Readiness Thresholds
- **0–49**: `Not Ready`
- **50–74**: `Almost Ready`
- **75–100**: `Placement Ready`
*(When provisional, prefixed as `Provisional (<Level>)` to preserve hiring integrity).*

### Component Statuses
- `assessed`: Sufficient real assessment data exists; score is a validated number (0–100).
- `not_assessed`: Assessment has not been performed; score is strictly `null`.
- `processing`: Document parsing or test verification is actively running.
- `failed`: Assessment could not be completed.
- `stale`: Underlying source files or profile data were modified after the review was completed.

### Top 5 Recommendation Prioritization
Findings from resume failures, project issues, secrets warnings, and GitHub gaps are ranked deterministically:
$$\text{Rank Score} = (\text{Priority Multiplier}) \times 100 + (\text{Component Weight}) \times 2 - \text{Index}$$
Duplicates are pruned, and at most the top 5 highest-leverage actions are returned. If fewer issues exist, no filler advice is invented.

---

## 10. Playwright Browser Setup (ai-service)

The Python service (`ai-service/`) runs Playwright for headless browser website verification and SSRF-hardened live-link checking:

```bash
cd ai-service
# Activate virtualenv
source .venv/bin/activate
# Install python dependencies including playwright
pip install -r requirements.txt
# Install headless Chromium browser binaries
playwright install chromium
```

To run the `ai-service`:
```bash
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 11. Security Considerations

1. **Password Security**: Passwords are encrypted with `bcryptjs` using a salt work factor of 10. Raw passwords and hashes are excluded from API payloads.
2. **JWT Authentication**: Tokens carry minimal required claims (`id`, `role`), signed with `JWT_SECRET`, expiring in 7 days.
3. **HTTP Hardening**: Helmet sets security headers including Content-Security-Policy, HSTS, and X-Content-Type-Options.
4. **Rate Limiting**: Brute-force protection limits authentication attempts to 30 requests per 15-minute window per IP.
5. **SSRF Hardening (Playwright Live Checker)**:
   - Only HTTP and HTTPS public URLs are permitted.
   - Hostnames resolving to loopback (`127.0.0.0/8`, `::1`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local (`169.254.0.0/16`), or cloud metadata services (`169.254.169.254`) are strictly blocked.
   - DNS resolution and route interception validate redirects so no private internal service can be probed.
6. **Credential Masking**:
   - Heuristic scanner identifies potential AWS access keys, GitHub tokens, database URIs, and unignored `.env` files.
   - All matches are strictly masked before persistence or sending to LLMs. Unmasked secrets are never logged or stored.
7. **Production Error Masking**: Internal error stacks and database connection strings are never leaked to clients.

---

## 12. AI Mock Interview Architecture & Rubric

### Interview Lifecycle
1. **Context Extraction**: Pulls real student skills, target role, and verified project technologies. Untrusted inputs are strictly sanitized before prompting.
2. **Adaptive Plan Generation**: Structures a 15-minute (4-question) or 20-minute (6-question) plan balancing technical, project deep-dive, problem solving, and behavioral questions.
3. **Server-Side Session Countdown**: Sessions expire strictly based on `expiresAt` set at creation time. Browser refreshes, reconnects, or client-side clock tampering cannot extend the session.
4. **Interactive Text Interview**: Students answer questions or skip. Answers are persisted immediately with submission timestamps.
5. **Evaluation Engine**: When completed, the transcript is evaluated across 5 official dimensions totaling 100 points:

| Evaluation Dimension | Weight | Criteria Evaluated |
| :--- | :---: | :--- |
| **Technical Accuracy & Fundamentals** | 30% | Correctness of technical mechanisms, data structures, and edge cases |
| **Project Understanding** | 25% | Depth of architectural knowledge and trade-offs of student's own projects |
| **Problem-Solving & Reasoning** | 20% | Structured thinking, complexity awareness, and edge-case handling |
| **Communication & Answer Structure** | 15% | Clarity, STAR methodology, and concise written explanation |
| **HR & Behavioral Responses** | 10% | Alignment with engineering values, collaboration, and ownership |

### Readiness Engine Integration
When an interview is evaluated:
- The completed score is immediately consumed by `interviewScoreAdapter.js`.
- The student's readiness score reflects the 20% interview component.
- The readiness assessment is marked stale or recalculated, preserving chronological snapshot history.

---

## 13. Job Sources, SerpApi Google Jobs & Application Tracking

### Permitted Job Sources
- **SerpApi Google Jobs API**: Live real-time search via `https://serpapi.com/search.json?engine=google_jobs`.
- **MSOT Campus Listings**: Postings created and verified by university placement officers and administrators.
- **Greenhouse Public Job Board API**: Read-only ingestion via `https://boards-api.greenhouse.io/v1/boards/{board}/jobs`.
- **Lever Public Postings API**: Read-only ingestion via `https://api.lever.co/v0/postings/{company}`.

### SerpApi Google Jobs Configuration Guide
1. **Sign up for SerpApi**: Visit [https://serpapi.com](https://serpapi.com) and create a free account (100 free searches/month).
2. **Obtain API Key**: Copy your private API key from your SerpApi Dashboard.
3. **Configure Server Environment**:
   Add the following variables to `server/.env`:
   ```env
   SERPAPI_API_KEY=your_actual_serpapi_key_here
   JOBS_DEFAULT_COUNTRY=in
   JOBS_DEFAULT_LANGUAGE=en
   JOBS_DEFAULT_LOCATION=Bengaluru, Karnataka, India
   ```
4. **Restart Backend**:
   ```bash
   cd server
   npm run dev
   ```
5. **Testing the Job Search Endpoint**:
   ```bash
   curl -H "Authorization: Bearer <STUDENT_JWT>" "http://localhost:5001/api/jobs/search?q=software+engineer+intern&location=Bengaluru"
   ```
6. **In-Memory Caching & Credit Conservation**:
   - The backend includes an in-memory 15-minute TTL cache keyed by query, location, and filters.
   - Repeated user queries or pagination transitions reuse cached responses without deducting provider credits.
7. **Safe External Navigation & Application Confirmation**:
   - Application links validate strict `http:` and `https:` protocols.
   - External links open with `target="_blank" rel="noopener noreferrer"`.
   - Opening an external apply link **never** automatically marks the position as applied. The student is prompted to explicitly confirm submission ("Mark as Applied"), ensuring accurate ATS metrics.
8. **Graceful Error States**:
   - When `SERPAPI_API_KEY` is not set, the UI displays a clean configuration guide instead of broken or fabricated data.
   - Rate limit (429) or provider quota errors render an informative alert with a retry button.

---

## 15. Local AI Inference Setup

The application supports zero-cost local LLM inference via Ollama without requiring paid cloud API keys:

1. **Install and Run Ollama**:
   ```bash
   # Download Ollama from https://ollama.ai
   # Start the Ollama local daemon
   ollama serve
   ```
2. **Pull Supported Model**:
   ```bash
   # Lightweight model tested & verified live on Mac:
   ollama pull smollm:135m
   # Or standard full-size model:
   ollama pull llama3
   ```
3. **Configure Environment in `server/.env`**:
   ```env
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=smollm:135m
   ```
4. **Verified Status**:
   - **Status**: Completed and tested.
   - Real local execution against running Ollama on `http://localhost:11434` tested and verified with `smollm:135m`.
   - If Ollama is offline or uninstalled, `OllamaProvider.js` transparently falls back to `RuleOnlyProvider.js` without dropping sessions or throwing unhandled exceptions.

---

## 16. Production Deployment & Docker Orchestration

The application includes multi-stage containerization for seamless cloud deployment:

### Quickstart with Docker Compose
```bash
# Build and start all 4 services: MongoDB, AI-Service (Playwright), Node Gateway, and Nginx SPA
docker compose up --build -d
```

### Services & Port Mappings
- **Web Client (Nginx)**: `http://localhost` (Port 80)
- **Node.js Express API**: `http://localhost:5001` (Port 5001)
- **Python Document & Live Check Service**: `http://localhost:8000` (Port 8000)
- **MongoDB Database**: `mongodb://localhost:27017` (Port 27017)

### Production Health Check Endpoint
```bash
curl http://localhost:5001/api/health
```
Response:
```json
{
  "success": true,
  "message": "Placement Copilot API is running",
  "environment": "production",
  "database": "connected",
  "aiProvider": "rules_only",
  "timestamp": "2026-10-17T15:00:00.000Z"
}
```

---

## 17. Architecture & Deliverable Specifications

Detailed documentation deliverables for auditors and development teams:
- 📑 [System Architecture & Design Document](file:///Users/ayushkumarmishra/Documents/resumereviewer/placement-copilot/docs/ARCHITECTURE.md)
- 📊 [Written Benchmark Specifications](file:///Users/ayushkumarmishra/Documents/resumereviewer/placement-copilot/docs/BENCHMARKS.md)
- 📝 [Synthetic Student Test Reports](file:///Users/ayushkumarmishra/Documents/resumereviewer/placement-copilot/docs/SAMPLE_REPORTS.md)
- 🧪 [Automated Test Execution Report](file:///Users/ayushkumarmishra/Documents/resumereviewer/placement-copilot/docs/TEST_REPORT.md)
- 📈 [Scalability & Performance Analysis](file:///Users/ayushkumarmishra/Documents/resumereviewer/placement-copilot/docs/SCALABILITY.md)
- 💰 [Cost Analysis & Token Estimation Report](file:///Users/ayushkumarmishra/Documents/resumereviewer/placement-copilot/docs/COST_REPORT.md)

