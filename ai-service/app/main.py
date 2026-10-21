from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.parse import router as parse_router
from .routes.live_check import router as live_check_router

app = FastAPI(
    title="Placement Readiness Copilot - Document & Live Verification Service",
    description="Microservice providing resume text extraction and Playwright-based website verification.",
    version="1.0.0"
)

# CORS Middleware (Restricted to internal Node.js backend or localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(parse_router, tags=["Resume Parsing"])
app.include_router(live_check_router, tags=["Live Website Verification"])

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
