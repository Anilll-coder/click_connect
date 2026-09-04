import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.db import get_db
from models.models import Block, Comment, Post, Report, User
from routes.auth import require_current_user
from schemas.schemas import ReportIn
from utils.ratelimit import limiter

logger = logging.getLogger("clickconnect.moderation")

router = APIRouter(prefix="/moderation", tags=["moderation"])


@router.post("/report", summary="Report a post, comment, or user")
@limiter.limit("10/hour")
def create_report(
    payload: ReportIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    if payload.target_type == "post":
        target = db.get(Post, payload.target_id)
    elif payload.target_type == "comment":
        target = db.get(Comment, payload.target_id)
    else:
        target = db.query(User).filter(User.id == payload.target_id).first()

    if not target:
        raise HTTPException(status_code=404, detail=f"{payload.target_type.capitalize()} not found")

    report = Report(
        reporter_id=current_user.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason.strip(),
    )
    db.add(report)
    db.commit()

    logger.info(
        "Report filed: reporter_id=%s target_type=%s target_id=%s",
        current_user.id, payload.target_type, payload.target_id,
    )
    return {"success": True, "message": "Thanks — our team will review this."}


@router.post("/block/{username}", summary="Block or unblock a user (toggle)")
@limiter.limit("30/minute")
def toggle_block(
    username: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")

    existing = db.query(Block).filter(
        Block.blocker_id == current_user.id, Block.blocked_id == target.id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"blocked": False}

    db.add(Block(blocker_id=current_user.id, blocked_id=target.id))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"blocked": True}

    return {"blocked": True}


@router.get("/blocked", summary="List users I've blocked")
@limiter.limit("60/minute")
def list_blocked(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    base = str(request.base_url).rstrip("/")
    rows = (
        db.query(User)
        .join(Block, Block.blocked_id == User.id)
        .filter(Block.blocker_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .all()
    )
    out = []
    for u in rows:
        avatar = u.avatar_url or ""
        if avatar.startswith("/"):
            avatar = f"{base}{avatar}"
        out.append({"id": u.id, "username": u.username, "avatar_url": avatar})
    return out


def get_blocked_user_ids(db: Session, user_id: int) -> set[int]:
    """Users this account has blocked — used to filter them out of feeds."""
    rows = db.query(Block.blocked_id).filter(Block.blocker_id == user_id).all()
    return {r[0] for r in rows}
