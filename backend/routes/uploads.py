# routes/uploads.py
import logging

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database.db import get_db
from models.models import User
from routes.auth import require_current_user
from utils.ratelimit import limiter
from utils.localStorage import (
    save_avatar,
    delete_avatar,
)

logger = logging.getLogger("clickconnect.uploads")

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.delete("/avatar")
@limiter.limit("10/minute")
def delete_profile(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    if current_user.avatar_url:
        delete_avatar(current_user.avatar_url, current_user.id)
    current_user.avatar_url = ""
    db.commit()
    return {"success": True}


@router.post("/avatar")
@limiter.limit("10/minute")
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    try:
        if current_user.avatar_url:
            delete_avatar(current_user.avatar_url, current_user.id)
        url = save_avatar(file, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception:
        logger.exception("Avatar upload failed for user_id=%s", current_user.id)
        raise HTTPException(500, "Failed to process upload")

    current_user.avatar_url = url
    db.commit()
    db.refresh(current_user)
    return {"avatar_url": url}
