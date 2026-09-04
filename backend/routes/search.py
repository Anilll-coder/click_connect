from typing import Optional

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database.db import get_db
from models.models import Post, User
from routes.auth import get_current_user
from utils.ratelimit import limiter

router = APIRouter(prefix="/search", tags=["search"])

MAX_QUERY_LENGTH = 100


def _escape_like(term: str) -> str:
    """Escape SQL LIKE wildcards so a search term can't turn into an
    unbounded/pathological pattern (e.g. a string of just '%' or '_')."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/users", summary="Search users by username")
@limiter.limit("30/minute")
def search_users(
    request: Request,
    q: str = Query(..., min_length=1, max_length=MAX_QUERY_LENGTH),
    limit: int = Query(10, ge=1, le=25),
    db: Session = Depends(get_db),
):
    term = q.strip()
    if not term:
        return []

    pattern = f"%{_escape_like(term)}%"
    users = (
        db.query(User)
        .filter(User.username.ilike(pattern, escape="\\"))
        .order_by(User.username.asc())
        .limit(limit)
        .all()
    )

    base = str(request.base_url).rstrip("/")
    out = []
    for u in users:
        avatar = u.avatar_url or ""
        if avatar.startswith("/"):
            avatar = f"{base}{avatar}"
        out.append({"id": u.id, "username": u.username, "avatar_url": avatar, "bio": u.bio})
    return out


@router.get("/posts", summary="Search public post text")
@limiter.limit("30/minute")
def search_posts(
    request: Request,
    q: str = Query(..., min_length=1, max_length=MAX_QUERY_LENGTH),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=25),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    term = q.strip()
    if not term:
        return []

    pattern = f"%{_escape_like(term)}%"
    posts = (
        db.query(Post)
        .filter(Post.is_anonymous == False, Post.body.ilike(pattern, escape="\\"))
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    base = str(request.base_url).rstrip("/")
    out = []
    for p in posts:
        author = p.author
        avatar = (author.avatar_url or "") if author else ""
        if avatar.startswith("/"):
            avatar = f"{base}{avatar}"
        out.append({
            "id": p.id,
            "body": p.body,
            "created_at": p.created_at.isoformat() if hasattr(p.created_at, "isoformat") else str(p.created_at),
            "author": {"id": author.id, "username": author.username, "avatar_url": avatar} if author else None,
        })
    return out
