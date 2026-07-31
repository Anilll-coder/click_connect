from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status,Query,File,UploadFile,Form
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from utils.localStorage import validate_file, secure_filename, save_image, save_video
from database.db import get_db
from routes.auth import get_current_user
from models.models import Post,PostMedia, User, Like, Comment

router = APIRouter(prefix="/posts", tags=["posts.me"])


def _public_url_to_local_path(url: str) -> Path:
    """
    Convert a stored public URL like "/static/uploads/post_images/abc.jpg"
    to a local filesystem path "static/uploads/post_images/abc.jpg".
    If url is absolute (http...), try to find the '/static/' part and convert.
    """
    if not url:
        return None
    if url.startswith("/"):
        return Path(url.lstrip("/"))
    idx = url.find("/static/")
    if idx != -1:
        return Path(url[idx + 1 :]) 
    return None


@router.get("")
def get_posts(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    is_anonymous: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),  # uses your existing auth helper
):
    """
    Paginated home feed: returns posts based on is_anonymous flag.
    If Authorization header present & valid, liked_by_current_user will be set per-post.
    """

    # 1) Query posts based on is_anonymous flag
    posts: List[Post] = (
        db.query(Post)
        .filter(getattr(Post, "is_anonymous", False) == is_anonymous)
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    if not posts:
        return JSONResponse(content=[])

    post_ids = [p.id for p in posts]
    author_ids = list({p.author_id for p in posts if p.author_id is not None})

    base = str(request.base_url).rstrip("/")

    # preload users
    users = db.query(User).filter(User.id.in_(author_ids)).all() if author_ids else []
    users_map = {u.id: u for u in users}

    # preload media
    media_rows = (
        db.query(PostMedia)
        .filter(PostMedia.post_id.in_(post_ids))
        .order_by(PostMedia.post_id, getattr(PostMedia, "order", PostMedia.id))
        .all()
    )
    media_map = {}
    for m in media_rows:
        url = m.url
        if url and isinstance(url, str) and url.startswith("/"):
            url = f"{base}{url}"
        media_map.setdefault(m.post_id, []).append({
            "id": m.id,
            "url": url,
            "media_type": m.media_type,
            "order": getattr(m, "order", None),
        })

    # likes count per post
    likes_counts = dict(
        db.query(Like.post_id, func.count(Like.id))
        .filter(Like.post_id.in_(post_ids))
        .group_by(Like.post_id)
        .all()
    )

    # comments count per post
    comments_counts = dict(
        db.query(Comment.post_id, func.count(Comment.id))
        .filter(Comment.post_id.in_(post_ids))
        .group_by(Comment.post_id)
        .all()
    )

    # liked set for current user (if authenticated)
    liked_set = set()
    if current_user:
        liked_rows = db.query(Like.post_id).filter(Like.post_id.in_(post_ids), Like.user_id == current_user.id).all()
        # liked_rows might be [(post_id,), ...] or objects; handle both
        liked_set = {r[0] if isinstance(r, (list, tuple)) else getattr(r, "post_id", None) for r in liked_rows}
        liked_set.discard(None)

    # build final result
    result = []
    for p in posts:
        u = users_map.get(p.author_id)
        avatar = None
        if u:
            avatar = getattr(u, "avatar_url", None)
            if avatar and isinstance(avatar, str) and avatar.startswith("/"):
                avatar = f"{base}{avatar}"

        is_anon = bool(getattr(p, "is_anonymous", False))

        author_out = None
        if not is_anon:
            author_out = {
                "id": u.id if u else p.author_id,
                "username": getattr(u, "username", None) if u else None,
                "avatar_url": avatar,
            }

        item = {
            "id": p.id,
            "body": p.body,
            "is_anonymous": is_anon,
            "author": author_out,
            "author_id": None if is_anon else p.author_id,
            "created_at": p.created_at.isoformat() if hasattr(p.created_at, "isoformat") else str(p.created_at),
            "media": media_map.get(p.id, []),
            "likes_count": int(likes_counts.get(p.id, 0)),
            "comments_count": int(comments_counts.get(p.id, 0)),
            "liked_by_current_user": bool(p.id in liked_set),
        }
        result.append(item)

    return JSONResponse(content=jsonable_encoder(result))


@router.get("/me", summary="Get current user's posts (paginated)")
def get_my_posts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns list of posts for the current user with media embedded.
    """
    posts = db.query(Post).filter(Post.author_id == current_user.id).order_by(Post.created_at.desc()).all()
    
    if not posts:
        return []
    
    post_ids = [p.id for p in posts]
    
    # Get likes for these posts by current user
    liked_rows = db.query(Like.post_id).filter(
        Like.post_id.in_(post_ids),
        Like.user_id == current_user.id
    ).all()
    liked_set = {row[0] for row in liked_rows}
    
    # Get likes count per post
    likes_counts = dict(
        db.query(Like.post_id, func.count(Like.id))
        .filter(Like.post_id.in_(post_ids))
        .group_by(Like.post_id)
        .all()
    )
    
    # Get comments count per post
    comments_counts = dict(
        db.query(Comment.post_id, func.count(Comment.id))
        .filter(Comment.post_id.in_(post_ids))
        .group_by(Comment.post_id)
        .all()
    )

    out = []
    for p in posts:
        media = []
        for m in p.media:
            media.append({"id": m.id, "url": "http://localhost:8000"+m.url, "media_type": m.media_type, "order": m.order})
        out.append({
            "id": p.id,
            "body": p.body,
            "created_at": p.created_at.isoformat(),
            "author": {
                "id": current_user.id,
                "username": current_user.username,
                "avatar_url": "http://localhost:8000"+current_user.avatar_url
            },
            "media": media,
            "likes_count": int(likes_counts.get(p.id, 0)),
            "comments_count": int(comments_counts.get(p.id, 0)),
            "liked_by_current_user": p.id in liked_set
        })
    return out


@router.get("/{post_id}")
def get_post_by_id(
    post_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Get a single post by ID with all its details.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    base = str(request.base_url).rstrip("/")
    
    # Get author
    author = db.query(User).filter(User.id == post.author_id).first() if post.author_id else None
    
    # Get media
    media_rows = db.query(PostMedia).filter(PostMedia.post_id == post_id).order_by(getattr(PostMedia, "order", PostMedia.id)).all()
    media_list = []
    for m in media_rows:
        url = m.url
        if url and isinstance(url, str) and url.startswith("/"):
            url = f"{base}{url}"
        media_list.append({
            "id": m.id,
            "url": url,
            "media_type": m.media_type,
            "order": getattr(m, "order", None),
        })
    
    # Get likes count
    likes_count = db.query(func.count(Like.id)).filter(Like.post_id == post_id).scalar() or 0
    
    # Get comments count
    comments_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post_id).scalar() or 0
    
    # Check if current user liked
    liked_by_current_user = False
    if current_user:
        liked_by_current_user = db.query(Like).filter(Like.post_id == post_id, Like.user_id == current_user.id).first() is not None
    
    is_anon = bool(getattr(post, "is_anonymous", False))
    
    author_out = None
    if not is_anon and author:
        avatar = getattr(author, "avatar_url", None)
        if avatar and isinstance(avatar, str) and avatar.startswith("/"):
            avatar = f"{base}{avatar}"
        author_out = {
            "id": author.id,
            "username": getattr(author, "username", None),
            "avatar_url": avatar,
        }
    
    result = {
        "id": post.id,
        "body": post.body,
        "is_anonymous": is_anon,
        "author": author_out,
        "author_id": None if is_anon else post.author_id,
        "created_at": post.created_at.isoformat() if hasattr(post.created_at, "isoformat") else str(post.created_at),
        "media": media_list,
        "likes_count": int(likes_count),
        "comments_count": int(comments_count),
        "liked_by_current_user": liked_by_current_user,
    }
    
    return JSONResponse(content=jsonable_encoder(result))


@router.get("/user/{username}")
def get_user_posts(
    username: str,
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    """
    Get all non-anonymous posts by a specific user.
    """
    # Find the user by username
    user = db.query(User).filter(User.username == username.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Query non-anonymous posts by this user
    posts: List[Post] = (
        db.query(Post)
        .filter(Post.author_id == user.id)
        .filter(getattr(Post, "is_anonymous", False) == False)
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    if not posts:
        return JSONResponse(content=[])
    
    base = str(request.base_url).rstrip("/")
    
    post_ids = [p.id for p in posts]
    
    # Get media
    media_rows = db.query(PostMedia).filter(PostMedia.post_id.in_(post_ids)).all()
    media_map = {}
    for m in media_rows:
        url = m.url
        if url and isinstance(url, str) and url.startswith("/"):
            url = f"{base}{url}"
        if m.post_id not in media_map:
            media_map[m.post_id] = []
        media_map[m.post_id].append({
            "url": url,
            "media_type": m.media_type,
            "order": m.order
        })
    
    # Get likes count
    likes_counts = dict(
        db.query(Like.post_id, func.count(Like.id))
        .filter(Like.post_id.in_(post_ids))
        .group_by(Like.post_id)
        .all()
    )
    
    # Get comments count
    comments_counts = dict(
        db.query(Comment.post_id, func.count(Comment.id))
        .filter(Comment.post_id.in_(post_ids))
        .group_by(Comment.post_id)
        .all()
    )
    
    # Check if current user liked
    liked_set = set()
    if current_user:
        liked_rows = db.query(Like.post_id).filter(
            Like.post_id.in_(post_ids),
            Like.user_id == current_user.id
        ).all()
        liked_set = {row[0] for row in liked_rows}
    
    # Build response
    result = []
    for p in posts:
        avatar = user.avatar_url or "/profile-picture.png"
        if avatar and isinstance(avatar, str) and avatar.startswith("/"):
            avatar = f"{base}{avatar}"
        
        author_out = {
            "id": user.id,
            "username": user.username,
            "avatar_url": avatar,
        }
        
        item = {
            "id": p.id,
            "body": p.body,
            "is_anonymous": False,
            "author": author_out,
            "author_id": user.id,
            "created_at": p.created_at.isoformat() if hasattr(p.created_at, "isoformat") else str(p.created_at),
            "media": media_map.get(p.id, []),
            "likes_count": int(likes_counts.get(p.id, 0)),
            "comments_count": int(comments_counts.get(p.id, 0)),
            "liked_by_current_user": bool(p.id in liked_set),
        }
        result.append(item)
    
    return JSONResponse(content=jsonable_encoder(result))


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_post(
    request: Request,
    body: str = Form(""),
    files: List[UploadFile] = File([]),
    is_anonymous: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a post with optional files and an `is_anonymous` flag.
    - Expects Authorization: Bearer <token>
    - Returns serialized post suitable to prepend to the feed.
    """
    print(is_anonymous)
    post_kwargs: Dict[str, Any] = {"author_id": current_user.id, "body": body or ""}
    if hasattr(Post, "is_anonymous"):
        post_kwargs["is_anonymous"] = bool(is_anonymous)

    post = Post(**post_kwargs)
    db.add(post)
    db.commit()
    db.refresh(post)

    saved_media = []
    try:
        for f in files:
            # read file bytes
            try:
                data = await f.read()
            except Exception as e:
                # cleanup and raise
                db.delete(post)
                db.commit()
                raise HTTPException(status_code=400, detail=f"Failed reading file {f.filename}: {str(e)}")

            # validate mime/size using your util
            try:
                kind = validate_file(f.content_type, len(data))
            except Exception as e:
                db.delete(post)
                db.commit()
                raise HTTPException(status_code=400, detail=f"Invalid file {f.filename}: {str(e)}")

            fname = secure_filename(f.filename)
            try:
                if kind == "image":
                    url = save_image(data, fname)
                else:
                    url = save_video(data, fname)
            except Exception as e:
                db.delete(post)
                db.commit()
                raise HTTPException(status_code=500, detail=f"Failed to save file {f.filename}: {str(e)}")

            media = PostMedia(post_id=post.id, url=url, media_type=kind)
            db.add(media)
            saved_media.append(media)

        db.commit()
    except HTTPException:
        # re-raise client errors
        raise
    except Exception as e:
        db.rollback()
        # keep post row (or remove) - here we keep post but log and return 500
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    # Build response: include full public urls for media using request.base_url
    base = str(request.base_url).rstrip("/")

    media_rows = db.query(PostMedia).filter(PostMedia.post_id == post.id).order_by(getattr(PostMedia, "order", PostMedia.id)).all()
    media_out = []
    for m in media_rows:
        media_out.append({
            "id": m.id,
            "url": str(_public_url_to_local_path(m.url)),
            "media_type": m.media_type,
            "order": getattr(m, "order", None),
        })

    # Author info: for the creator we show real author (feed serialization will mask for others)
    avatar = getattr(current_user, "avatar_url", None)
    if avatar and avatar.startswith("/"):
        avatar = f"{base}{avatar}"

    return {
        "id": post.id,
        "body": post.body,
        "author": {
            "id": current_user.id,
            "username": current_user.username,
            "avatar_url": avatar,
        },
        "author_id": post.author_id,
        "is_anonymous": bool(getattr(post, "is_anonymous", False)),
        "created_at": post.created_at.isoformat() if hasattr(post, "created_at") else str(post.id),
        "media": media_out,
        "likes_count": 0,
        "comments_count": 0,
        "liked_by_current_user": False,
    }


@router.put("/{post_id}", summary="Update a post body (owner only)")
def update_post(post_id: int, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Expects JSON body: { "body": "new text" }.
    Only the author can edit.
    Returns updated post object.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    new_body = payload.get("body", "")
    if not isinstance(new_body, str) or not new_body.strip():
        raise HTTPException(status_code=400, detail="Invalid body")

    post.body = new_body.strip()
    db.add(post)
    db.commit()
    db.refresh(post)

    # serialize response similar to GET /posts/me
    media = [{"id": m.id, "url": m.url, "media_type": m.media_type, "order": m.order} for m in post.media]
    return {
        "id": post.id,
        "body": post.body,
        "created_at": post.created_at.isoformat(),
        "media": media,
        "likes_count": getattr(post, "likes_count", None),
        "comments_count": getattr(post, "comments_count", None)
    }


@router.delete("/{post_id}", summary="Delete a post (owner only)")
def delete_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Deletes the post row and removes related media files from disk.
    Cascade will remove PostMedia DB rows, but file deletion must be done manually.
    """
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    media_paths = []
    for m in post.media:
        p = _public_url_to_local_path(m.url)
        if p:
            media_paths.append(p)

    try:
        db.delete(post)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Delete failed")

    for p in media_paths:
        try:
            safe_root = Path("static").resolve()
            target = Path(p).resolve()
            if safe_root in target.parents or target == safe_root:
                if target.exists():
                    target.unlink()
            else:
                pass
        except Exception:
            pass

    return {"deleted": True, "post_id": post_id}
