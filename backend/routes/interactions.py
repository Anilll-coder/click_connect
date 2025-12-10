# routes/interactions.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
from database.db import get_db
from routes.auth import get_current_user  
from models.models import Post, Like, Comment, User, Notification
from schemas.schemas import CommentCreate

router = APIRouter(prefix="/interactions", tags=["interactions"])


@router.post("/like/{post_id}", summary="Toggle like for a post")
def toggle_like(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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

        db.commit()
        return {"liked": True, "likes_count": post.likes_count if hasattr(post, "likes_count") else db.query(Like).filter(Like.post_id == post_id).count()}


@router.get("/likes/{post_id}", summary="Get likes count (and whether current user liked)")
def get_likes(post_id: int, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    likes_count = post.likes_count if hasattr(post, "likes_count") else db.query(Like).filter(Like.post_id == post_id).count()
    liked = False
    if current_user:
        liked = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first() is not None
    return {"likes_count": likes_count, "liked": liked}


@router.post("/comment/{post_id}", summary="Add a comment to a post")
def add_comment(post_id: int, comment_data: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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
        "author": {"id": current_user.id, "username": current_user.username, "avatar_url": current_user.avatar_url}
    }


@router.get("/comments/{post_id}", summary="List comments for a post")
def list_comments(post_id: int, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    q = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).offset(skip).limit(limit).all()
    out = []
    for c in q:
        out.append({
            "id": c.id,
            "text": c.text,
            "created_at": c.created_at.isoformat(),
            "author": {
                "id": c.user.id,
                "username": c.user.username,
                "avatar_url": c.user.avatar_url
            }
        })
    return out
