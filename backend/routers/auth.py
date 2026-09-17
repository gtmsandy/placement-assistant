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

from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth_identifiers import InvalidIdentifier
from auth_identifiers import NormalizedIdentifier
from auth_identifiers import normalize_identifier
from database import get_db
from models import Student
from models import User
from password_recovery import GENERIC_RECOVERY_MESSAGE
from password_recovery import prepare_password_recovery


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
INVALID_LOGIN_DETAIL = (
    "Invalid username/email/mobile or password."
)


security = HTTPBearer(
    auto_error=False
)


class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: str


class ForgotPasswordRequest(BaseModel):
    identifier: str


class ForgotPasswordResponse(BaseModel):
    message: str


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


DUMMY_PASSWORD_HASH = hash_password(
    "authentication-placeholder"
)


def resolve_user(
    db: Session,
    identifier: NormalizedIdentifier,
    *,
    role: str | None = None,
) -> User | None:
    query = (
        db.query(User)
        .outerjoin(
            Student,
            User.student_id == Student.id,
        )
    )

    if role is not None:
        query = query.filter(
            func.lower(User.role) == role
        )

    if identifier.kind == "mobile":
        query = query.filter(
            Student.mobile == identifier.value
        )
    elif (
        identifier.kind == "email"
        and role == "student"
    ):
        query = query.filter(
            func.lower(Student.email)
            == identifier.value
        )
    elif (
        identifier.kind == "email"
        and role is None
    ):
        query = query.filter(
            or_(
                func.lower(User.username)
                == identifier.value,
                func.lower(Student.email)
                == identifier.value,
            )
        )
    else:
        query = query.filter(
            func.lower(User.username)
            == identifier.value
        )

    matches = query.limit(2).all()

    if len(matches) != 1:
        return None

    return matches[0]


def invalid_login_error() -> HTTPException:
    return HTTPException(
        status_code=401,
        detail=INVALID_LOGIN_DETAIL,
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )


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
    requested_role = (
        login_data.role
        .strip()
        .lower()
    )

    user = None

    if requested_role in {
        "admin",
        "student",
    }:
        try:
            identifier = normalize_identifier(
                login_data.identifier,
                role=requested_role,
            )
        except InvalidIdentifier:
            identifier = None

        if identifier is not None:
            user = resolve_user(
                db,
                identifier,
                role=requested_role,
            )

    password_matches = verify_password(
        login_data.password,
        (
            user.password_hash
            if user is not None
            else DUMMY_PASSWORD_HASH
        )
    )

    if user is None or not password_matches:
        raise invalid_login_error()

    access_token = create_access_token(
        user.id,
        user.role,
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
)
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    user = None

    try:
        identifier = normalize_identifier(
            request.identifier
        )
    except InvalidIdentifier:
        identifier = None

    if identifier is not None:
        user = resolve_user(
            db,
            identifier,
        )

    prepare_password_recovery(user)

    return {
        "message": GENERIC_RECOVERY_MESSAGE,
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
