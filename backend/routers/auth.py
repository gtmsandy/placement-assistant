import os

from dotenv import load_dotenv

load_dotenv()

from datetime import datetime, timedelta, timezone

import bcrypt

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.security import HTTPBearer

from jose import JWTError
from jose import jwt

from pydantic import BaseModel

from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import Student
from models import User


router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"],
)


SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY environment variable is not set"
    )


ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
TOKEN_TYPE = "access"


security = HTTPBearer(
    auto_error=False
)


class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    student_id: int | None = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


def hash_password(password: str):
    password_bytes = password.encode("utf-8")

    if len(password_bytes) > 72:
        raise ValueError(
            "Password cannot exceed 72 bytes"
        )

    return bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(
    plain_password: str,
    hashed_password: str,
):
    password_bytes = plain_password.encode("utf-8")

    if len(password_bytes) > 72:
        return False

    try:
        return bcrypt.checkpw(
            password_bytes,
            hashed_password.encode("utf-8")
        )
    except (ValueError, TypeError):
        return False


def create_access_token(
    user_id: int,
    role: str,
):
    now = datetime.now(timezone.utc)

    expire = (
        now
        + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "type": TOKEN_TYPE,
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db),
):
    identifier = (
        login_data.identifier
        .strip()
        .lower()
    )

    requested_role = (
        login_data.role
        .strip()
        .lower()
    )

    user = (
        db.query(User)
        .outerjoin(
            Student,
            User.student_id == Student.id
        )
        .filter(
            or_(
                User.username == identifier,
                Student.email == identifier
            )
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    actual_role = (
        user.role
        .strip()
        .lower()
    )

    if requested_role != actual_role:
        raise HTTPException(
            status_code=403,
            detail=f"This account is registered as {user.role}",
        )

    access_token = create_access_token(
        user.id,
        user.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        security
    ),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )

    if credentials is None:
        raise credentials_exception

    if credentials.scheme.lower() != "bearer":
        raise credentials_exception

    token = credentials.credentials

    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        token_type = payload.get("type")

        if token_type != TOKEN_TYPE:
            raise credentials_exception

        user_id = payload.get("sub")

        if user_id is None:
            raise credentials_exception

        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        raise credentials_exception

    return user


def require_student(
    current_user: User = Depends(
        get_current_user
    ),
):
    if current_user.role.lower() != "student":
        raise HTTPException(
            status_code=403,
            detail="Student access required",
        )

    return current_user


def require_admin(
    current_user: User = Depends(
        get_current_user
    ),
):
    if current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required",
        )

    return current_user


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(
        get_current_user
    ),
):
    return current_user