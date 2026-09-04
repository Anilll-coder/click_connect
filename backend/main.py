from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.orm import Session
from database.db import engine, get_db
from models.models import Base
from routes import auth, route, uploads, interactions, posts, notifications

app = FastAPI()

origins = ["https://click-connect-1.onrender.com"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

routes = [route.router, auth.router, uploads.router, interactions.router, posts.router, notifications.router]
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
