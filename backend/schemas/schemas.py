from pydantic import BaseModel, EmailStr,Field
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
    email: EmailStr
    username: str
    is_active: bool
    avatar_url: str | None = None

from pydantic import BaseModel, EmailStr,Field
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
    email: EmailStr
    username: str
    is_active: bool
    avatar_url: str | None = None
    bio: str | None = None

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
        form_attributes = True