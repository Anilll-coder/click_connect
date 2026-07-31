# routes/auth.py
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from database.db import get_db
from models.models import User
from schemas.schemas import LoginIn, TokenOut, UserOut
from configuration.config import settings
from utils.localStorage import validate_file, save_avatar_bytes

SECRET_KEY = settings.secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Do NOT auto raise errors on missing Authorization header — we will handle it explicitly
auth_scheme = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"])


def create_token(sub: str):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": sub, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    email: str = Form(...),
    username: str = Form(...),
    password: str = Form(...),
    avatar: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    email = email.strip().lower()
    username = username.strip()
    if not username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username cannot be empty")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    user = User(email=email, username=username, password=password)
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
            db.add(user)
            db.commit()
            db.refresh(user)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save avatar: {str(e)}")
    else:
        # Assign default avatar if none uploaded
        user.avatar_url = "/static/default-avatar.png"
        db.add(user)
        db.commit()
        db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "avatar_url": user.avatar_url,
    }


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    identifier = payload.email_or_username.strip()
    user = db.query(User).filter(
        (User.email == identifier) |
        (User.username == identifier)
    ).first()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or email")

    # plaintext password compare (replace with hashed compare in real app)
    if user.password != payload.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    token = create_token(sub=user.username)
    return {"access_token": token, "token_type": "bearer"}


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(auth_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    If Authorization header absent -> returns None (anonymous).
    If present but invalid -> raises 401.
    If present and valid -> returns User.
    """
    if credentials is None:
        # no header -> anonymous
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    if current_user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing credentials")
    return current_user


@router.get("/user/{username}", response_model=UserOut)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/update", summary="Update user profile")
async def update_user(
    username: str = Form(None),
    email: str = Form(None),
    bio: str = Form(None),
    avatar: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    if username:
        username = username.strip()
        if not username:
            raise HTTPException(status_code=400, detail="Username cannot be empty")

    if email:
        email = email.strip().lower()

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
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save avatar: {str(e)}")

    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url
    }
