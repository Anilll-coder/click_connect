# routes/uploads.py
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from database.db import get_db
from models.models import User, Post, PostMedia
from routes.auth import get_current_user
from utils.localStorage import (
    save_avatar,
    save_image,
    save_video,
    secure_filename,
    validate_file,
    delete_avatar
)

router = APIRouter(prefix="/uploads", tags=["uploads"])

@router.delete("/avatar")
def delete_profile(db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)):
    delete_avatar(current_user.avatar_url,current_user.id)


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        if current_user.avatar_url!="":
            delete_avatar(current_user.avatar_url,current_user.id)
        url = save_avatar(file, current_user.id)
    except Exception as e:
        raise HTTPException(400, str(e))

    current_user.avatar_url = url
    db.commit()
    db.refresh(current_user)
    return {"avatar_url": url}


@router.post("/post")
async def create_post(
    body: str = Form(...),
    files: list[UploadFile] = File([]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = Post(author_id=current_user.id, body=body)
    db.add(post)
    db.commit()
    db.refresh(post)

    all_urls = []

    for f in files:
        data = await f.read()

        try:
            kind = validate_file(f.content_type, len(data))
        except Exception as e:
            raise HTTPException(400, str(e))

        saved_name = secure_filename(f.filename)

        if kind == "image":
            url = save_image(data, saved_name)
        else:  # video
            url = save_video(data, saved_name)

        media = PostMedia(post_id=post.id, url=url, media_type=kind)
        db.add(media)
        all_urls.append(url)

    db.commit()
    return {"post_id": post.id, "media": all_urls}
