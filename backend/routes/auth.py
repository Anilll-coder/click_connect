# routes/auth.py
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy import func
from sqlalchemy.orm import Session

from database.db import get_db
from models.models import Follow, Post, User
from schemas.schemas import LoginIn, TokenOut, UserOut
from configuration.config import settings
from utils.localStorage import validate_file, save_avatar_bytes
from utils.security import hash_password, validate_password_policy, verify_and_migrate
from utils.ratelimit import limiter

logger = logging.getLogger("clickconnect.auth")

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Do NOT auto raise errors on missing Authorization header — we will handle it explicitly
auth_scheme = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_USERNAME_LENGTH = 32
MAX_BIO_LENGTH = 500


def create_token(sub: str):
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": sub, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/signup", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
async def signup(
    request: Request,
    email: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    avatar: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    email = email.strip().lower()
    username = username.strip()

    if not username or len(username) > MAX_USERNAME_LENGTH:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username must be 1-{MAX_USERNAME_LENGTH} characters")

    password_error = validate_password_policy(password)
    if password_error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=password_error)

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    user = User(email=email, username=username, password=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)

    if avatar:
        try:
            data = await avatar.read()
            kind = validate_file(avatar.content_type, len(data))
            if kind != "image":
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Avatar must be an image")

            url = save_avatar_bytes(data, avatar.filename, user.id)
            user.avatar_url = url
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        except Exception:
            logger.exception("Failed to save avatar during signup for user_id=%s", user.id)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save avatar")
    else:
        user.avatar_url = "/static/default-avatar.png"

    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("New signup: user_id=%s username=%s", user.id, user.username)

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "avatar_url": user.avatar_url,
    }


@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
def login(request: Request, payload: LoginIn, db: Session = Depends(get_db)):
    identifier = payload.email_or_username.strip()
    user = db.query(User).filter(
        (User.email == identifier) |
        (User.username == identifier)
    ).first()

    # Generic message for both "no such account" and "wrong password" so a
    # caller can't enumerate which usernames/emails exist.
    generic_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user:
        logger.warning("Login failed (no such account): identifier=%s", identifier)
        raise generic_error

    is_valid, new_hash = verify_and_migrate(user.password, payload.password)
    if not is_valid:
        logger.warning("Login failed (bad password): user_id=%s", user.id)
        raise generic_error

    if new_hash:
        # Transparent upgrade from a legacy plaintext row to a proper hash.
        user.password = new_hash
        db.commit()
        logger.info("Migrated legacy password hash for user_id=%s", user.id)

    logger.info("Login success: user_id=%s", user.id)
    token = create_token(sub=user.username)
    return {"access_token": token, "token_type": "bearer"}


def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    If Authorization header absent -> returns None (anonymous).
    If present but invalid -> raises 401.
    If present and valid -> returns User.

    Also stamps `request.state.current_user_id` so rate limiting can key
    by authenticated user, not just IP.
    """
    request.state.current_user_id = None

    if credentials is None:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    request.state.current_user_id = user.id
    return user


def require_current_user(current_user: Optional[User] = Depends(get_current_user)) -> User:
    """Use for endpoints that must not proceed without a logged-in user.

    `get_current_user` stays nullable so public/optional-auth endpoints
    (e.g. the feed) can keep working for anonymous visitors.
    """
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    return current_user


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(require_current_user)):
    return current_user


@router.get("/user/{username}", response_model=UserOut)
def get_user_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    posts_count = db.query(func.count(Post.id)).filter(
        Post.author_id == user.id, Post.is_anonymous == False
    ).scalar() or 0
    followers_count = db.query(func.count(Follow.id)).filter(Follow.following_id == user.id).scalar() or 0
    following_count = db.query(func.count(Follow.id)).filter(Follow.follower_id == user.id).scalar() or 0

    is_self = bool(current_user and current_user.id == user.id)
    is_following = False
    if current_user and not is_self:
        is_following = db.query(Follow).filter(
            Follow.follower_id == current_user.id, Follow.following_id == user.id
        ).first() is not None

    return UserOut(
        id=user.id,
        email=user.email if is_self else None,
        username=user.username,
        is_active=user.is_active,
        avatar_url=user.avatar_url,
        bio=user.bio,
        created_at=user.created_at,
        posts_count=posts_count,
        followers_count=followers_count,
        following_count=following_count,
        is_following=is_following,
        is_self=is_self,
    )


@router.delete("/me", summary="Permanently delete your account")
@limiter.limit("3/hour")
def delete_account(request: Request, current_user: User = Depends(require_current_user), db: Session = Depends(get_db)):
    """Deletes the account and, via DB cascade, everything owned by it
    (posts, comments, likes, bookmarks, follows, notifications)."""
    logger.info("Account deletion: user_id=%s username=%s", current_user.id, current_user.username)
    db.delete(current_user)
    db.commit()
    return {"success": True}


@router.put("/update", summary="Update user profile")
@limiter.limit("20/hour")
async def update_user(
    request: Request,
    username: str = Form(None),
    email: str = Form(None),
    bio: str = Form(None),
    avatar: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_current_user),
):
    if username:
        username = username.strip()
        if not username or len(username) > MAX_USERNAME_LENGTH:
            raise HTTPException(status_code=400, detail=f"Username must be 1-{MAX_USERNAME_LENGTH} characters")

    if email:
        email = email.strip().lower()

    if bio is not None and len(bio) > MAX_BIO_LENGTH:
        raise HTTPException(status_code=400, detail=f"Bio must be at most {MAX_BIO_LENGTH} characters")

    # Check uniqueness if changing
    if username and username != current_user.username:
        if db.query(User).filter(User.username == username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = username

    if email and email != current_user.email:
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        current_user.email = email

    if bio is not None:
        current_user.bio = bio

    if avatar:
        try:
            data = await avatar.read()
            kind = validate_file(avatar.content_type, len(data))
            if kind != "image":
                raise HTTPException(status_code=400, detail="Avatar must be an image")

            url = save_avatar_bytes(data, avatar.filename, current_user.id)
            current_user.avatar_url = url
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception:
            logger.exception("Failed to save avatar for user_id=%s", current_user.id)
            raise HTTPException(status_code=500, detail="Failed to save avatar")

    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
    }
