from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from database.db import engine
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

@app.get("/")
def read_root():
    return ""
