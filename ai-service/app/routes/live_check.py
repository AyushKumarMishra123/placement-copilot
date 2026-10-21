from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from ..services.live_checker import verify_website_live

router = APIRouter()

class LiveCheckRequest(BaseModel):
    url: str = Field(..., description="Public website URL to inspect")

class ViewportInspection(BaseModel):
    status: str
    error: Optional[str] = None
    screenshotBase64: Optional[str] = None
    consoleErrors: List[str] = Field(default_factory=list)
    pageErrors: Optional[List[str]] = Field(default_factory=list)

class LiveCheckResponse(BaseModel):
    success: bool
    reachable: bool
    errorCode: Optional[str] = None
    message: Optional[str] = None
    httpStatus: Optional[int] = None
    initialUrl: Optional[str] = None
    finalUrl: Optional[str] = None
    pageTitle: Optional[str] = None
    hasReadableContent: Optional[bool] = False
    visibleTextSnippet: Optional[str] = None
    desktop: Optional[Dict[str, Any]] = None
    mobile: Optional[Dict[str, Any]] = None
    performance: Optional[Dict[str, Any]] = None

@router.post(
    "/check-live-link",
    response_model=LiveCheckResponse,
    summary="Verify public project website via Playwright with SSRF protections"
)
async def check_live_link_endpoint(request: LiveCheckRequest):
    result = await verify_website_live(request.url)
    return result
