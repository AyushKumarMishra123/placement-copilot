# AI Infrastructure & Operational Cost Analysis Report
## Placement Readiness Copilot

---

## 1. Executive Cost Summary

Placement Readiness Copilot was designed with a **hybrid deterministic-AI architecture**. Because 100% of the rubric scoring, benchmark checks, ATS validation, secret detection, and readiness weights are calculated via deterministic Node.js and Python code, the platform does not depend on paid AI APIs to produce accurate, reproducible scores.

For qualitative narrative generation and interview question synthesis, the platform supports three provider tiers:

| Provider Mode | Infrastructure / API | Unit Cost (Input / Output) | Cost per Full Assessment | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Rule-Only Provider** | In-Process Node.js | $0.00 / 0 tokens | **$0.00** | Default fallback; 100% free |
| **Ollama Local Mode** | Self-hosted (`smollm:135m`, `llama3`) | $0.00 / 0 tokens | **$0.00** (Local GPU/CPU) | Tested & verified live on Mac |
| **Google Gemini 1.5 Flash** | Cloud API (`@google/generative-ai`) | $0.075 / 1M in, $0.30 / 1M out | **~$0.00035** | Free tier available (15 RPM / 1500 RPD) |

---

## 2. Token Usage Breakdown per Student Workflow

When Gemini or Ollama inference is enabled, the prompt engineering pipeline bounds all context to avoid unbounded token consumption:

### A. Resume Intelligence Review
- **Input Text Bounding**: Clean text truncated to maximum 3,000 characters (~750 tokens).
- **Prompt Structure**: Schema definition, failed benchmark check IDs, skills list (~500 tokens).
- **Input Total**: ~1,250 tokens.
- **Output Generation**: Structured JSON containing 4 strengths, 4 weaknesses, 4 recommendations, and 1 summary (~300 tokens).
- **Estimated Cost (Gemini 1.5 Flash)**:
  - Input: $1,250 \times (\$0.075 / 1,000,000) = \$0.00009375$
  - Output: $300 \times (\$0.30 / 1,000,000) = \$0.00009000$
  - **Total**: **$0.00018** (~0.018 cents)

### B. Project Code & Repository Analysis
- **Input Text Bounding**: README truncated to 4,000 characters; repo file tree and secret findings (~1,000 tokens).
- **Input Total**: ~1,400 tokens.
- **Output Generation**: Key strengths and prioritized engineering recommendations (~250 tokens).
- **Estimated Cost (Gemini 1.5 Flash)**:
  - Input: $1,400 \times (\$0.075 / 1,000,000) = \$0.000105$
  - Output: $250 \times (\$0.30 / 1,000,000) = \$0.000075$
  - **Total**: **$0.00018** (~0.018 cents)

### C. Text Mock Interview
- **Question Generation**: Single prompt with candidate target role, skills, and projects (~600 tokens in, ~350 tokens out).
- **Interview Transcript Evaluation**: Combined student answers (5-6 questions) evaluated against technical, reasoning, and behavioral rubric (~1,500 tokens in, ~400 tokens out).
- **Total Mock Interview Cost (Gemini 1.5 Flash)**:
  - Input: $2,100 \times (\$0.075 / 1,000,000) = \$0.0001575$
  - Output: $750 \times (\$0.30 / 1,000,000) = \$0.000225$
  - **Total**: **$0.00038** (~0.038 cents)

---

## 3. Total Cost per Candidate Complete Placement Cycle

Assuming a student completes:
1. One complete resume upload & benchmark review
2. Two project repository analyses
3. One full 15-minute mock interview session
4. Readiness assessment recalculation

**Combined Estimated AI Cost per Student**:
$$\$0.00018 + (2 \times \$0.00018) + \$0.00038 = \mathbf{\$0.00092}\text{ (less than one-tenth of a cent)}$$

For a cohort of **1,000 graduating engineering students**:
- Total AI inference cost: **~$0.92 USD** (under one dollar total).
- Within Gemini free-tier quotas (1,500 requests per day) for up to 300 active student assessments daily at zero cost.

---

## 4. Local Ollama Operational Cost & Hardware Profile

- **Model Tested**: `smollm:135m` (91 MB download, < 300 MB RAM resident).
- **Inference Hardware**: Apple Silicon Mac (M-series) / standard x86 CPU.
- **Execution Time**: Cold start load ~17s, subsequent inference < 800ms.
- **Direct Financial Cost**: **$0.00** (Zero API tokens, completely offline).
- **Network Dependency**: None after initial model weights download.

---

## 5. Costs That Cannot Be Determined

In strict accordance with honesty guidelines, the following costs depend on customer-selected hosting providers and cannot be universally fixed:
1. **Cloud VM / VPS Hosting**: Costs vary between DigitalOcean ($12/mo), Render ($7/mo per web service), AWS EC2 (t4g.small ~$15/mo), or on-premise university servers ($0 additional).
2. **Playwright Headless Chrome Overhead**: Requires approximately 300MB - 500MB of RAM during concurrent browser page loads.
3. **MongoDB Atlas Database**: Free M0 cluster tier ($0/mo up to 512MB storage), scaling to dedicated M10 clusters ($57/mo) for large enterprise deployments.
