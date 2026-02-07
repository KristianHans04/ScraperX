"""
Camoufox Stealth Browser Service

A FastAPI service that wraps Camoufox for stealth browser automation.
Provides HTTP endpoints for executing scraping tasks with anti-detection.
"""

import asyncio
import os
import logging
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime
import base64
import json

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from camoufox.async_api import AsyncCamoufox

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
HOST = os.getenv("CAMOUFOX_HOST", "0.0.0.0")
PORT = int(os.getenv("CAMOUFOX_PORT", "8765"))
MAX_CONCURRENT_BROWSERS = int(os.getenv("MAX_CONCURRENT_BROWSERS", "5"))
BROWSER_TIMEOUT = int(os.getenv("BROWSER_TIMEOUT", "60000"))


@dataclass
class BrowserInstance:
    """Represents an active browser instance."""
    browser: Any
    context: Any
    created_at: datetime
    in_use: bool = False


class BrowserPool:
    """Manages a pool of Camoufox browser instances."""
    
    def __init__(self, max_size: int = 5):
        self.max_size = max_size
        self.semaphore = asyncio.Semaphore(max_size)
        self.active_count = 0
        self._lock = asyncio.Lock()
    
    @asynccontextmanager
    async def acquire(self, options: Optional[Dict[str, Any]] = None):
        """Acquire a browser instance from the pool."""
        async with self.semaphore:
            async with self._lock:
                self.active_count += 1
            
            browser = None
            context = None
            try:
                # Create Camoufox browser with options
                camoufox_options = {
                    "headless": True,
                    "geoip": options.get("geoip") if options else None,
                }
                
                # Remove None values
                camoufox_options = {k: v for k, v in camoufox_options.items() if v is not None}
                
                async with AsyncCamoufox(**camoufox_options) as browser:
                    context = await browser.new_context()
                    yield browser, context
            finally:
                if context:
                    try:
                        await context.close()
                    except Exception as e:
                        logger.error(f"Error closing context: {e}")
                
                async with self._lock:
                    self.active_count -= 1


# Global browser pool
browser_pool: Optional[BrowserPool] = None


# Pydantic Models
class WaitCondition(BaseModel):
    type: str = Field(..., description="Type of wait: selector, timeout, networkidle, load")
    value: Optional[str] = Field(None, description="Value for the wait condition")
    timeout: int = Field(30000, description="Timeout in milliseconds")


class ScenarioAction(BaseModel):
    action: str = Field(..., description="Action type: click, type, scroll, wait, screenshot")
    selector: Optional[str] = Field(None, description="CSS selector for the action")
    value: Optional[str] = Field(None, description="Value for type actions")
    x: Optional[int] = Field(None, description="X coordinate for scroll")
    y: Optional[int] = Field(None, description="Y coordinate for scroll")


class ScrapeRequest(BaseModel):
    url: str = Field(..., description="URL to scrape")
    wait_for: Optional[WaitCondition] = Field(None, description="Wait condition before extracting")
    selectors: Optional[Dict[str, str]] = Field(None, description="CSS selectors to extract")
    scenario: Optional[List[ScenarioAction]] = Field(None, description="Actions to perform")
    screenshot: bool = Field(False, description="Take a screenshot")
    screenshot_full_page: bool = Field(False, description="Full page screenshot")
    pdf: bool = Field(False, description="Generate PDF")
    timeout: int = Field(30000, description="Page timeout in milliseconds")
    proxy: Optional[str] = Field(None, description="Proxy URL")
    headers: Optional[Dict[str, str]] = Field(None, description="Custom headers")
    cookies: Optional[List[Dict[str, Any]]] = Field(None, description="Cookies to set")
    geoip: Optional[str] = Field(None, description="GeoIP country code for fingerprint")


class ScrapeResponse(BaseModel):
    success: bool
    url: str
    status_code: Optional[int] = None
    html: Optional[str] = None
    extracted: Optional[Dict[str, Any]] = None
    screenshot: Optional[str] = None  # Base64 encoded
    pdf: Optional[str] = None  # Base64 encoded
    cookies: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None
    timing: Dict[str, float] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    active_browsers: int
    max_browsers: int
    uptime_seconds: float


# Track startup time
startup_time = datetime.now()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global browser_pool
    
    logger.info(f"Starting Camoufox service on {HOST}:{PORT}")
    logger.info(f"Max concurrent browsers: {MAX_CONCURRENT_BROWSERS}")
    
    # Initialize browser pool
    browser_pool = BrowserPool(max_size=MAX_CONCURRENT_BROWSERS)
    
    yield
    
    logger.info("Shutting down Camoufox service")


app = FastAPI(
    title="Camoufox Stealth Browser Service",
    description="Anti-detection browser automation service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        active_browsers=browser_pool.active_count if browser_pool else 0,
        max_browsers=MAX_CONCURRENT_BROWSERS,
        uptime_seconds=(datetime.now() - startup_time).total_seconds(),
    )


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest):
    """Execute a scraping task with stealth browser."""
    timing = {}
    start_time = asyncio.get_event_loop().time()
    
    try:
        options = {}
        if request.geoip:
            options["geoip"] = request.geoip
        
        async with browser_pool.acquire(options) as (browser, context):
            timing["browser_acquired"] = asyncio.get_event_loop().time() - start_time
            
            # Set custom headers if provided
            if request.headers:
                await context.set_extra_http_headers(request.headers)
            
            # Set cookies if provided
            if request.cookies:
                await context.add_cookies(request.cookies)
            
            # Set proxy if provided (note: must be set at context creation)
            # For per-request proxy, we'd need to create a new context
            
            # Create new page
            page = await context.new_page()
            page.set_default_timeout(request.timeout)
            
            try:
                # Navigate to URL
                nav_start = asyncio.get_event_loop().time()
                response = await page.goto(request.url, wait_until="domcontentloaded")
                timing["navigation"] = asyncio.get_event_loop().time() - nav_start
                
                status_code = response.status if response else None
                
                # Execute wait condition
                if request.wait_for:
                    wait_start = asyncio.get_event_loop().time()
                    await _execute_wait(page, request.wait_for)
                    timing["wait"] = asyncio.get_event_loop().time() - wait_start
                
                # Execute scenario actions
                if request.scenario:
                    scenario_start = asyncio.get_event_loop().time()
                    for action in request.scenario:
                        await _execute_action(page, action)
                    timing["scenario"] = asyncio.get_event_loop().time() - scenario_start
                
                # Extract content
                extract_start = asyncio.get_event_loop().time()
                html = await page.content()
                timing["extract"] = asyncio.get_event_loop().time() - extract_start
                
                # Extract selectors
                extracted = None
                if request.selectors:
                    extracted = {}
                    for name, selector in request.selectors.items():
                        try:
                            elements = await page.query_selector_all(selector)
                            if len(elements) == 1:
                                extracted[name] = await elements[0].text_content()
                            else:
                                extracted[name] = [await el.text_content() for el in elements]
                        except Exception as e:
                            logger.warning(f"Failed to extract {name}: {e}")
                            extracted[name] = None
                
                # Take screenshot
                screenshot_b64 = None
                if request.screenshot:
                    ss_start = asyncio.get_event_loop().time()
                    screenshot_bytes = await page.screenshot(full_page=request.screenshot_full_page)
                    screenshot_b64 = base64.b64encode(screenshot_bytes).decode()
                    timing["screenshot"] = asyncio.get_event_loop().time() - ss_start
                
                # Generate PDF
                pdf_b64 = None
                if request.pdf:
                    pdf_start = asyncio.get_event_loop().time()
                    pdf_bytes = await page.pdf()
                    pdf_b64 = base64.b64encode(pdf_bytes).decode()
                    timing["pdf"] = asyncio.get_event_loop().time() - pdf_start
                
                # Get cookies
                cookies = await context.cookies()
                
                timing["total"] = asyncio.get_event_loop().time() - start_time
                
                return ScrapeResponse(
                    success=True,
                    url=request.url,
                    status_code=status_code,
                    html=html,
                    extracted=extracted,
                    screenshot=screenshot_b64,
                    pdf=pdf_b64,
                    cookies=cookies,
                    timing=timing,
                )
                
            finally:
                await page.close()
                
    except asyncio.TimeoutError:
        timing["total"] = asyncio.get_event_loop().time() - start_time
        return ScrapeResponse(
            success=False,
            url=request.url,
            error="Timeout while loading page",
            timing=timing,
        )
    except Exception as e:
        timing["total"] = asyncio.get_event_loop().time() - start_time
        logger.exception(f"Error scraping {request.url}: {e}")
        return ScrapeResponse(
            success=False,
            url=request.url,
            error=str(e),
            timing=timing,
        )


async def _execute_wait(page, wait: WaitCondition):
    """Execute a wait condition."""
    if wait.type == "selector":
        await page.wait_for_selector(wait.value, timeout=wait.timeout)
    elif wait.type == "timeout":
        await asyncio.sleep(wait.timeout / 1000)
    elif wait.type == "networkidle":
        await page.wait_for_load_state("networkidle", timeout=wait.timeout)
    elif wait.type == "load":
        await page.wait_for_load_state("load", timeout=wait.timeout)
    else:
        raise ValueError(f"Unknown wait type: {wait.type}")


async def _execute_action(page, action: ScenarioAction):
    """Execute a scenario action."""
    if action.action == "click":
        if not action.selector:
            raise ValueError("Click action requires a selector")
        await page.click(action.selector)
    
    elif action.action == "type":
        if not action.selector or action.value is None:
            raise ValueError("Type action requires selector and value")
        await page.fill(action.selector, action.value)
    
    elif action.action == "scroll":
        x = action.x or 0
        y = action.y or 0
        await page.evaluate(f"window.scrollBy({x}, {y})")
    
    elif action.action == "wait":
        timeout = int(action.value) if action.value else 1000
        await asyncio.sleep(timeout / 1000)
    
    elif action.action == "screenshot":
        # Screenshot action is handled separately
        pass
    
    elif action.action == "hover":
        if not action.selector:
            raise ValueError("Hover action requires a selector")
        await page.hover(action.selector)
    
    elif action.action == "select":
        if not action.selector or action.value is None:
            raise ValueError("Select action requires selector and value")
        await page.select_option(action.selector, action.value)
    
    elif action.action == "press":
        if action.value is None:
            raise ValueError("Press action requires a key value")
        await page.keyboard.press(action.value)
    
    else:
        raise ValueError(f"Unknown action type: {action.action}")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Camoufox Stealth Browser",
        "version": "1.0.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
