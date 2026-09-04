import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.db import get_db
from models.models import Follow, Notification, User
from routes.auth import get_current_user, require_current_user
from utils.ratelimit import limiter

logger = logging.getLogger("clickconnect.follow")

router = APIRouter(prefix="/follow", tags=["follow"])


def _serialize_user(u: User, base: str) -> dict:
    avatar = u.avatar_url or ""
    if avatar.startswith("/"):
        avatar = f"{base}{avatar}"
    return {"id": u.id, "username": u.username, "avatar_url": avatar, "bio": u.bio}


@router.post("/{username}", summary="Follow or unfollow a user (toggle)")
@limiter.limit("30/minute")
def toggle_follow(
    username: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    existing = db.query(Follow).filter(
        Follow.follower_id == current_user.id, Follow.following_id == target.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"following": False}

    db.add(Follow(follower_id=current_user.id, following_id=target.id))
    notif = Notification(
        user_id=target.id,
        actor_id=current_user.id,
        type="follow",
        message=f"{current_user.username} started following you",
    )
    db.add(notif)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"following": True}

    return {"following": True}


@router.get("/{username}/followers", summary="List a user's followers")
@limiter.limit("60/minute")
def list_followers(
    username: str,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    base = str(request.base_url).rstrip("/")
    rows = (
        db.query(User)
        .join(Follow, Follow.follower_id == User.id)
        .filter(Follow.following_id == target.id)
        .order_by(Follow.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize_user(u, base) for u in rows]


@router.get("/{username}/following", summary="List who a user follows")
@limiter.limit("60/minute")
def list_following(
    username: str,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    base = str(request.base_url).rstrip("/")
    rows = (
        db.query(User)
        .join(Follow, Follow.following_id == User.id)
        .filter(Follow.follower_id == target.id)
        .order_by(Follow.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_serialize_user(u, base) for u in rows]
