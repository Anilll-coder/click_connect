from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.db import get_db
from models.models import Bookmark, Post, PostMedia, User
from routes.auth import require_current_user
from utils.ratelimit import limiter

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.post("/{post_id}", summary="Bookmark or unbookmark a post (toggle)")
@limiter.limit("60/minute")
def toggle_bookmark(
    post_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id, Bookmark.post_id == post_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"bookmarked": False}

    db.add(Bookmark(user_id=current_user.id, post_id=post_id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"bookmarked": True}

    return {"bookmarked": True}


@router.get("", summary="List my bookmarked posts")
@limiter.limit("60/minute")
def list_bookmarks(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    bookmarks = (
        db.query(Bookmark)
        .filter(Bookmark.user_id == current_user.id)
        .order_by(Bookmark.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    if not bookmarks:
        return []

    post_ids = [b.post_id for b in bookmarks]
    posts = db.query(Post).filter(Post.id.in_(post_ids)).all()
    posts_map = {p.id: p for p in posts}

    base = str(request.base_url).rstrip("/")
    out = []
    for b in bookmarks:
        p = posts_map.get(b.post_id)
        if not p:
            continue  # post was deleted after being bookmarked
        is_anon = bool(p.is_anonymous)
        author_out = None
        if not is_anon and p.author:
            avatar = p.author.avatar_url or ""
            if avatar.startswith("/"):
                avatar = f"{base}{avatar}"
            author_out = {"id": p.author.id, "username": p.author.username, "avatar_url": avatar}

        media = []
        for m in p.media:
            url = f"{base}{m.url}" if m.url and m.url.startswith("/") else m.url
            media.append({"id": m.id, "url": url, "media_type": m.media_type, "order": m.order})

        out.append({
            "id": p.id,
            "body": p.body,
            "is_anonymous": is_anon,
            "author": author_out,
            "author_id": None if is_anon else p.author_id,
            "created_at": p.created_at.isoformat() if hasattr(p.created_at, "isoformat") else str(p.created_at),
            "media": media,
            "likes_count": p.likes_count or 0,
            "comments_count": p.comments_count or 0,
            "liked_by_current_user": any(l.user_id == current_user.id for l in p.likes),
            "is_owner": p.author_id == current_user.id,
            "bookmarked_by_current_user": True,
            "bookmarked_at": b.created_at.isoformat() if hasattr(b.created_at, "isoformat") else str(b.created_at),
        })
    return out
