# routes/interactions.py
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from typing import Optional
from database.db import get_db
from routes.auth import get_current_user, require_current_user
from models.models import Post, Like, Comment, CommentLike, User, Notification
from schemas.schemas import CommentCreate
from utils.ratelimit import limiter

router = APIRouter(prefix="/interactions", tags=["interactions"])

MAX_COMMENT_LENGTH = 2000


@router.post("/like/{post_id}", summary="Toggle like for a post")
@limiter.limit("60/minute")
def toggle_like(post_id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_current_user)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first()
    if existing:
        db.delete(existing)
        if hasattr(post, "likes_count"):
            post.likes_count = max(0, (post.likes_count or 0) - 1)
        db.commit()
        return {"liked": False, "likes_count": post.likes_count if hasattr(post, "likes_count") else db.query(Like).filter(Like.post_id == post_id).count()}
    else:
        like = Like(post_id=post_id, user_id=current_user.id)
        db.add(like)
        if hasattr(post, "likes_count"):
            post.likes_count = (post.likes_count or 0) + 1

        # Create Notification if not self-like
        if post.author_id != current_user.id:
            # Check if notification already exists to avoid spamming (optional, but good for likes)
            existing_notif = db.query(Notification).filter(
                Notification.user_id == post.author_id,
                Notification.actor_id == current_user.id,
                Notification.post_id == post_id,
                Notification.type == "like"
            ).first()

            if not existing_notif:
                notif = Notification(
                    user_id=post.author_id,
                    actor_id=current_user.id,
                    post_id=post_id,
                    type="like",
                    message=f"{current_user.username} liked your post"
                )
                db.add(notif)

        try:
            db.commit()
        except IntegrityError:
            # Concurrent double-click raced us to the unique (user_id, post_id)
            # constraint — the like already exists, so this isn't an error.
            db.rollback()
            return {"liked": True, "likes_count": db.query(Like).filter(Like.post_id == post_id).count()}
        return {"liked": True, "likes_count": post.likes_count if hasattr(post, "likes_count") else db.query(Like).filter(Like.post_id == post_id).count()}


@router.get("/likes/{post_id}", summary="Get likes count (and whether current user liked)")
@limiter.limit("90/minute")
def get_likes(post_id: int, request: Request, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    likes_count = post.likes_count if hasattr(post, "likes_count") else db.query(Like).filter(Like.post_id == post_id).count()
    liked = False
    if current_user:
        liked = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first() is not None
    return {"likes_count": likes_count, "liked": liked}


@router.post("/comment/{post_id}", summary="Add a comment to a post")
@limiter.limit("30/minute")
def add_comment(post_id: int, comment_data: CommentCreate, request: Request, db: Session = Depends(get_db), current_user: User = Depends(require_current_user)):
    text = comment_data.text
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Empty comment")

    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = Comment(post_id=post_id, user_id=current_user.id, text=text.strip())
    db.add(comment)
    if hasattr(post, "comments_count"):
        post.comments_count = (post.comments_count or 0) + 1
    
    # Create Notification if not self-comment
    if post.author_id != current_user.id:
        notif = Notification(
            user_id=post.author_id,
            actor_id=current_user.id,
            post_id=post_id,
            type="comment",
            message=f"{current_user.username} commented on your post"
        )
        db.add(notif)

    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "text": comment.text,
        "created_at": comment.created_at.isoformat(),
        "updated_at": None,
        "likes_count": 0,
        "liked_by_current_user": False,
        "is_owner": True,
        "author": {"id": current_user.id, "username": current_user.username, "avatar_url": current_user.avatar_url}
    }


@router.get("/comments/{post_id}", summary="List comments for a post")
@limiter.limit("60/minute")
def list_comments(
    post_id: int,
    request: Request,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    limit = max(1, min(limit, 50))
    skip = max(0, skip)
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    q = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).offset(skip).limit(limit).all()

    comment_ids = [c.id for c in q]
    liked_set = set()
    if current_user and comment_ids:
        liked_rows = db.query(CommentLike.comment_id).filter(
            CommentLike.comment_id.in_(comment_ids), CommentLike.user_id == current_user.id
        ).all()
        liked_set = {r[0] for r in liked_rows}

    out = []
    for c in q:
        out.append({
            "id": c.id,
            "text": c.text,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "likes_count": c.likes_count or 0,
            "liked_by_current_user": c.id in liked_set,
            "is_owner": bool(current_user and c.user_id == current_user.id),
            "author": {
                "id": c.user.id,
                "username": c.user.username,
                "avatar_url": c.user.avatar_url
            }
        })
    return out


@router.put("/comment/{comment_id}", summary="Edit a comment (owner only)")
@limiter.limit("30/minute")
def edit_comment(
    comment_id: int,
    comment_data: CommentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    text = comment_data.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    comment.text = text
    comment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "text": comment.text,
        "created_at": comment.created_at.isoformat(),
        "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
    }


@router.delete("/comment/{comment_id}", summary="Delete a comment (owner only)")
@limiter.limit("30/minute")
def delete_comment(
    comment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    post = db.get(Post, comment.post_id)
    db.delete(comment)
    if post and hasattr(post, "comments_count"):
        post.comments_count = max(0, (post.comments_count or 0) - 1)
    db.commit()

    return {"deleted": True, "comment_id": comment_id}


@router.post("/comment/{comment_id}/like", summary="Toggle like for a comment")
@limiter.limit("60/minute")
def toggle_comment_like(
    comment_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    existing = db.query(CommentLike).filter(
        CommentLike.comment_id == comment_id, CommentLike.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        comment.likes_count = max(0, (comment.likes_count or 0) - 1)
        db.commit()
        return {"liked": False, "likes_count": comment.likes_count}

    db.add(CommentLike(comment_id=comment_id, user_id=current_user.id))
    comment.likes_count = (comment.likes_count or 0) + 1
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return {"liked": True, "likes_count": db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()}

    return {"liked": True, "likes_count": comment.likes_count}
