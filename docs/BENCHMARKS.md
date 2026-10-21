# Benchmark Engine & Scoring Specifications
## Placement Readiness Copilot

---

## 1. Resume Intelligence Benchmarks

The Resume Intelligence module evaluates parsed document text and AST metadata across 9 deterministic benchmark checks:

| Check ID | Dimension | Weight | Pass Criteria | Fail / Warning Threshold |
| :--- | :--- | :---: | :--- | :--- |
| `CHECK_PAGE_COUNT` | Document Structure | 15% | Page count equals exactly 1 page | > 1 page triggers warning and penalty |
| `CHECK_CONTACT_INFO` | Identity & Reachability | 10% | Email and telephone number detected | Missing contact info fails check |
| `CHECK_PROFILE_LINKS` | Professional Proof | 10% | GitHub, LinkedIn, or portfolio link present | No active links found |
| `CHECK_ESSENTIAL_SECTIONS`| ATS Layout | 15% | Experience, Projects, Education, Skills headers found | Missing 2+ core sections fails check |
| `CHECK_PROJECT_QUALITY` | Engineering Portfolio | 15% | 2+ detailed projects with tech stack keywords | Fewer than 2 projects or zero tech tags |
| `CHECK_MEASURABLE_RESULTS`| Impact Quantification | 15% | Quantifiable impact metrics (`%`, `ms`, `$`, numbers) | Descriptions lack quantifiable results |
| `CHECK_SKILLS_DIVERSITY` | Technical Breadth | 10% | 6+ verified technical skills detected | Fewer than 6 skills listed |
| `CHECK_ACTION_VERBS` | Ownership & Writing | 5% | Bullets begin with strong active verbs (Engineered, Architected) | Passive phrasing (Assisted with, Responsible for) |
| `CHECK_ACHIEVEMENTS` | Distinction & Honors | 5% | Hackathons, awards, or competitive coding honors | No achievements listed |

---

## 2. GitHub & Source-Code Intelligence Benchmarks

Evaluates candidate open-source presence and project hygiene via GitHub REST API v3:

| Metric | Target Standard | Scoring Logic |
| :--- | :--- | :--- |
| **Commit Regularity** | Active within last 90 days | Verified commits in 90-day window: 100%; inactive: proportional decay |
| **Profile README** | Present & informative | Dedicated profile README markdown file detected in candidate repository |
| **Bio & Location** | Populated professional bio | Non-empty bio and location fields in GitHub profile |
| **Pinned Repositories** | 2 to 6 pinned projects | Candidates highlighting curated projects score maximum credit |
| **License & Hygiene** | Open source license present | MIT, Apache, BSD, or GPL detected in reviewed repositories |
| **Secret Scanning** | Zero exposed credentials | AWS keys, private keys, or `.env` files trigger critical security warning |

---

## 3. Project & Live-Link Verification Benchmarks

Verified using Playwright headless browser rendering:

| Verification Stage | Methodology | Failure Condition |
| :--- | :--- | :--- |
| **SSRF Verification** | Pre-flight DNS validation | IP resolves to private (`10.0.0.0/8`, `192.168.0.0/16`), loopback, or metadata (`169.254.169.254`) |
| **HTTP Response** | Headless navigation (10s timeout) | HTTP status code >= 400 or connection refused |
| **Visual Rendering** | Viewport capture (Desktop & Mobile) | Empty DOM body, rendering error, or SSL certificate expiration |
| **Console Errors** | Browser console logging audit | Uncaught JavaScript runtime exceptions detected on page load |

---

## 4. AI Mock Interview Rubric Benchmarks (100 Points Total)

Evaluated across 5 official dimensions using observable transcript evidence:

| Evaluation Dimension | Weight | Observable Evidence Criteria |
| :--- | :---: | :--- |
| **Technical Accuracy & Fundamentals** | 30% | Correct explanation of runtime complexity, concurrency, database indexing, and edge cases |
| **Project Understanding** | 25% | Articulation of student's own project architecture, design trade-offs, and scaling bottlenecks |
| **Problem-Solving & Reasoning** | 20% | Structured breakdown of problem requirements, algorithmic selection, and trade-off analysis |
| **Communication & Answer Structure** | 15% | Answer conciseness, structured explanation (STAR format), and precise technical vocabulary |
| **HR & Behavioral Responses** | 10% | Evidence of ownership, collaboration, handling production incidents, and peer feedback |

---

## 5. Placement Readiness Scoring Methodology

### Official Component Weights (Validated to sum to exactly 100%)
- **Resume Quality**: 25%
- **Projects & Code**: 25%
- **Mock Interview**: 20%
- **GitHub Profile**: 10%
- **Coding Practice (DSA)**: 10%
- **LinkedIn Profile**: 5%
- **Achievements & Honors**: 5%

### Provisional vs. Final Score Calculation

1. **Provisional Readiness Score**:
   Calculated when not all 7 components have completed reviews. Evaluated strictly from assessed components, normalized by their combined weight:
   $$\text{Provisional Score} = \frac{\sum (\text{Component Score} \times \text{Component Weight})}{\sum \text{Weights of Assessed Components}}$$
   *Unassessed components are never scored as zero.* Coverage percentage reflects $\frac{\sum \text{Weights of Assessed Components}}{100} \times 100\%$.

2. **Final Placement Readiness Score**:
   Requires 100% assessment coverage:
   $$\text{Final Score} = \sum (\text{Component Score} \times \frac{\text{Component Weight}}{100})$$

### Readiness Thresholds
- **0–49**: `Not Ready`
- **50–74**: `Almost Ready`
- **75–100**: `Placement Ready`

*(Provisional scores are transparently labeled as `Provisional (<Level>)` on all dashboards).*
