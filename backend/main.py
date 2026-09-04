import logging

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text
from sqlalchemy.orm import Session
from database.db import engine, get_db
from models.models import Base
from routes import auth, route, uploads, interactions, posts, notifications, search, follow, bookmarks, moderation
from utils.ratelimit import limiter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI()

app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    response = JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please slow down and try again shortly."},
    )
    retry_after = getattr(exc, "retry_after", None)
    if retry_after:
        response.headers["Retry-After"] = str(int(retry_after))
    return response


origins = ["https://click-connect-1.onrender.com"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


Base.metadata.create_all(bind=engine)
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

routes = [
    route.router, auth.router, uploads.router, interactions.router, posts.router,
    notifications.router, search.router, follow.router, bookmarks.router, moderation.router,
]
for router in routes:
    app.include_router(router)


@app.api_route("/", methods=["GET", "HEAD"])
def read_root():
    return ""


@app.api_route("/health", methods=["GET", "HEAD"])
def health_check(db: Session = Depends(get_db)):
    """Pings Supabase via a real query so scheduled health checks (e.g. UptimeRobot)
    keep the free-tier project active, not just the web server."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "error", "supabase": "unreachable"})
    return {"status": "ok", "supabase": "connected"}
