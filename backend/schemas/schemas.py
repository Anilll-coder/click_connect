from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class SignupIn(BaseModel):
    email: EmailStr
    username: str
    password: str


class LoginIn(BaseModel):
    email_or_username: str
    password: str


class UserOut(BaseModel):
    id: int
    email: Optional[EmailStr] = None
    username: str
    is_active: bool
    avatar_url: str | None = None
    bio: str | None = None
    created_at: Optional[datetime] = None
    posts_count: Optional[int] = None
    followers_count: Optional[int] = None
    following_count: Optional[int] = None
    is_following: Optional[bool] = None
    is_self: Optional[bool] = None

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CommentCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class CommentAuthor(BaseModel):
    id: Optional[int]
    username: Optional[str]
    avatar_url: Optional[str] = None


class CommentOut(BaseModel):
    id: int
    text: str
    created_at: Optional[datetime]
    author: CommentAuthor

    class Config:
        from_attributes = True


class ReportIn(BaseModel):
    target_type: str = Field(..., pattern="^(post|comment|user)$")
    target_id: int
    reason: str = Field(..., min_length=3, max_length=500)
