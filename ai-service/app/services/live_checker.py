import base64
import time
from typing import Dict, Any, List
from urllib.parse import urlparse
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError

from ..utils.ssrf_protection import validate_and_resolve_url

DESKTOP_VIEWPORT = {"width": 1280, "height": 800}
MOBILE_VIEWPORT = {"width": 390, "height": 844}
NAVIGATION_TIMEOUT_MS = 15000

async def verify_website_live(raw_url: str) -> Dict[str, Any]:
    """
    Safely inspects a public website URL using Playwright.
    Enforces strict SSRF protections on initial URL, subresources, and redirects.
    """
    # 1. SSRF Pre-flight validation
    is_safe, error_msg, sanitized_url = validate_and_resolve_url(raw_url)
    if not is_safe:
        return {
            "success": False,
            "reachable": False,
            "errorCode": "BLOCKED_DESTINATION",
            "message": error_msg,
            "initialUrl": raw_url,
            "finalUrl": None,
            "httpStatus": None,
            "pageTitle": None,
            "hasReadableContent": False,
            "desktop": None,
            "mobile": None,
            "consoleErrors": [],
            "pageErrors": []
        }

    start_time = time.time()
    desktop_console_errors: List[str] = []
    desktop_page_errors: List[str] = []
    mobile_console_errors: List[str] = []

    try:
        async with async_playwright() as p:
            # Launch browser with sandboxed restricted arguments
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-default-browser-check"
                ]
            )

            # Route interceptor function to block subresource / redirect SSRF
            async def handle_route(route, request):
                req_url = request.url
                safe, _, _ = validate_and_resolve_url(req_url)
                if not safe:
                    await route.abort("blockedbyclient")
                else:
                    await route.continue_()

            # ----------------- DESKTOP PASS -----------------
            desktop_context = await browser.new_context(
                viewport=DESKTOP_VIEWPORT,
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PlacementCopilotVerifier/1.0"
            )
            await desktop_context.route("**/*", handle_route)

            desktop_page = await desktop_context.new_page()
            desktop_page.set_default_timeout(NAVIGATION_TIMEOUT_MS)

            desktop_page.on("console", lambda msg: desktop_console_errors.append(msg.text) if msg.type == "error" else None)
            desktop_page.on("pageerror", lambda exc: desktop_page_errors.append(str(exc)))

            response = None
            nav_error = None
            try:
                response = await desktop_page.goto(sanitized_url, wait_until="domcontentloaded", timeout=NAVIGATION_TIMEOUT_MS)
                # Wait briefly for client-side rendering / hydration
                await desktop_page.wait_for_timeout(1000)
            except PlaywrightTimeoutError:
                nav_error = "Page load timed out after 15 seconds."
            except Exception as e:
                nav_error = f"Navigation error: {str(e)}"

            final_url = desktop_page.url if desktop_page else sanitized_url
            # Verify final redirected URL for SSRF
            final_safe, final_err, _ = validate_and_resolve_url(final_url)
            if not final_safe:
                await browser.close()
                return {
                    "success": False,
                    "reachable": False,
                    "errorCode": "BLOCKED_REDIRECT",
                    "message": "Website attempted to redirect to a prohibited internal network address.",
                    "initialUrl": sanitized_url,
                    "finalUrl": final_url
                }

            page_title = None
            readable_text = ""
            has_readable_content = False
            desktop_screenshot_b64 = None

            try:
                page_title = await desktop_page.title()
            except Exception:
                page_title = None

            try:
                # Extract visible body text (up to 2000 chars) for semantic claim matching
                body_elem = await desktop_page.query_selector("body")
                if body_elem:
                    inner_text = await body_elem.inner_text()
                    readable_text = (inner_text or "").strip()[:2000]
                    has_readable_content = len(readable_text) > 30
            except Exception:
                readable_text = ""

            try:
                screenshot_bytes = await desktop_page.screenshot(type="jpeg", quality=80, full_page=False)
                desktop_screenshot_b64 = base64.b64encode(screenshot_bytes).decode("utf-8")
            except Exception as e:
                desktop_console_errors.append(f"Failed to capture desktop screenshot: {str(e)}")

            http_status = response.status if response else (200 if not nav_error else None)

            # ----------------- MOBILE PASS -----------------
            mobile_screenshot_b64 = None
            mobile_status = "success"

            try:
                mobile_context = await browser.new_context(
                    viewport=MOBILE_VIEWPORT,
                    is_mobile=True,
                    has_touch=True,
                    user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
                )
                await mobile_context.route("**/*", handle_route)
                mobile_page = await mobile_context.new_page()
                mobile_page.set_default_timeout(NAVIGATION_TIMEOUT_MS)
                mobile_page.on("console", lambda msg: mobile_console_errors.append(msg.text) if msg.type == "error" else None)

                await mobile_page.goto(sanitized_url, wait_until="domcontentloaded", timeout=NAVIGATION_TIMEOUT_MS)
                await mobile_page.wait_for_timeout(800)
                m_bytes = await mobile_page.screenshot(type="jpeg", quality=75, full_page=False)
                mobile_screenshot_b64 = base64.b64encode(m_bytes).decode("utf-8")
                await mobile_context.close()
            except Exception as m_err:
                mobile_status = f"Mobile rendering failure: {str(m_err)}"

            await desktop_context.close()
            await browser.close()

            elapsed_ms = int((time.time() - start_time) * 1000)

            is_reachable = (http_status is not None and http_status < 400 and not nav_error)

            return {
                "success": is_reachable,
                "reachable": is_reachable,
                "httpStatus": http_status,
                "initialUrl": sanitized_url,
                "finalUrl": final_url,
                "pageTitle": page_title or "",
                "hasReadableContent": has_readable_content,
                "visibleTextSnippet": readable_text[:1000],
                "desktop": {
                    "status": "success" if not nav_error else "failed",
                    "error": nav_error,
                    "screenshotBase64": desktop_screenshot_b64,
                    "consoleErrors": desktop_console_errors[:10],
                    "pageErrors": desktop_page_errors[:5]
                },
                "mobile": {
                    "status": "success" if mobile_screenshot_b64 else "failed",
                    "error": None if mobile_screenshot_b64 else mobile_status,
                    "screenshotBase64": mobile_screenshot_b64,
                    "consoleErrors": mobile_console_errors[:5]
                },
                "performance": {
                    "loadDurationMs": elapsed_ms
                }
            }

    except Exception as exc:
        return {
            "success": False,
            "reachable": False,
            "errorCode": "EXECUTION_ERROR",
            "message": f"Browser verification encountered an internal error: {str(exc)}",
            "initialUrl": sanitized_url,
            "finalUrl": None,
            "httpStatus": None
        }
