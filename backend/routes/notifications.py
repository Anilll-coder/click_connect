from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database.db import get_db
from routes.auth import get_current_user
from models.models import Notification, User

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", summary="Get user notifications")
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Fetch all notifications for the current user, ordered by newest first.
    """
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    
    # Serialize manually or use a schema. Manual for simplicity here.
    return [
        {
            "id": n.id,
            "type": n.type,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
            "actor": {
                "id": n.actor.id,
                "username": n.actor.username,
                "avatar_url": n.actor.avatar_url
            } if n.actor else None,
            "post_id": n.post_id
        }
        for n in notifications
    ]

@router.post("/{notification_id}/read", summary="Mark notification as read")
def mark_read(notification_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notification = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == current_user.id).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    db.commit()
    return {"success": True}


@router.get("/unread-count", summary="Get unread notifications count")
def get_unread_count(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    count = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()
    return {"count": count}


@router.post("/mark-all-read", summary="Mark all notifications as read")
def mark_all_read(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"success": True}
