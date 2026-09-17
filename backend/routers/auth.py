import os

from dotenv import load_dotenv

load_dotenv()

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.security import HTTPBearer

from jose import JWTError
from jose import jwt

from pydantic import BaseModel
from pydantic import Field

from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session

from auth_identifiers import InvalidIdentifier
from auth_identifiers import NormalizedIdentifier
from auth_identifiers import normalize_identifier
from database import get_db
from models import Student
from models import User
from password_security import hash_password
from password_security import verify_password
from password_recovery import GENERIC_RECOVERY_MESSAGE
from password_recovery import INVALID_CODE_MESSAGE
from password_recovery import PasswordPolicyError
from password_recovery import PasswordRecoveryService
from password_recovery import RecoveryCodeError
from password_recovery import RecoveryConfigurationError
from password_recovery import RecoveryRateLimitError
from password_recovery import RecoverySecrets
from password_recovery import ResetAuthorizationError
from providers.factory import ProviderConfigurationError
from providers.factory import create_otp_provider


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


class PasswordRecoveryResponse(BaseModel):
    message: str
    challenge_id: str
    retry_after_seconds: int


class PasswordRecoveryResendRequest(BaseModel):
    challenge_id: str


class PasswordRecoveryVerifyRequest(BaseModel):
    challenge_id: str
    otp: str = Field(min_length=6, max_length=6, pattern=r"^[0-9]{6}$")


class PasswordRecoveryVerifyResponse(BaseModel):
    reset_token: str
    expires_in_seconds: int


class PasswordResetRequest(BaseModel):
    new_password: str


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
    auth_version: int = 0,
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
        "auth_version": auth_version,
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
        user.auth_version or 0,
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
    return {
        "message": GENERIC_RECOVERY_MESSAGE,
    }


def get_password_recovery_service(
    db: Session = Depends(get_db),
) -> PasswordRecoveryService:
    try:
        recovery_secrets = RecoverySecrets.from_environment()
        provider = create_otp_provider()
    except (RecoveryConfigurationError, ProviderConfigurationError) as error:
        raise HTTPException(
            status_code=503,
            detail="Password recovery is temporarily unavailable.",
        ) from error
    return PasswordRecoveryService(
        db,
        recovery_secrets,
        provider,
    )


def _parse_challenge_id(value: str):
    import uuid

    try:
        return uuid.UUID(value)
    except (ValueError, TypeError, AttributeError) as error:
        raise HTTPException(status_code=400, detail=INVALID_CODE_MESSAGE) from error


@router.post(
    "/password-recovery/request",
    response_model=PasswordRecoveryResponse,
    status_code=202,
)
def request_password_recovery(
    request: ForgotPasswordRequest,
    service: PasswordRecoveryService = Depends(get_password_recovery_service),
):
    try:
        result = service.request(request.identifier)
    except RecoveryRateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail=str(error),
            headers={"Retry-After": str(error.retry_after)},
        ) from error
    return {
        "message": result.message,
        "challenge_id": str(result.challenge_id),
        "retry_after_seconds": result.retry_after_seconds,
    }


@router.post(
    "/password-recovery/resend",
    response_model=PasswordRecoveryResponse,
)
def resend_password_recovery(
    request: PasswordRecoveryResendRequest,
    service: PasswordRecoveryService = Depends(get_password_recovery_service),
):
    try:
        result = service.resend(_parse_challenge_id(request.challenge_id))
    except RecoveryRateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail=str(error),
            headers={"Retry-After": str(error.retry_after)},
        ) from error
    except RecoveryCodeError as error:
        raise HTTPException(status_code=400, detail=INVALID_CODE_MESSAGE) from error
    return {
        "message": result.message,
        "challenge_id": str(result.challenge_id),
        "retry_after_seconds": result.retry_after_seconds,
    }


@router.post(
    "/password-recovery/verify",
    response_model=PasswordRecoveryVerifyResponse,
)
def verify_password_recovery(
    request: PasswordRecoveryVerifyRequest,
    service: PasswordRecoveryService = Depends(get_password_recovery_service),
):
    try:
        result = service.verify(
            _parse_challenge_id(request.challenge_id),
            request.otp,
        )
    except RecoveryCodeError as error:
        raise HTTPException(status_code=400, detail=INVALID_CODE_MESSAGE) from error
    return result


@router.post("/password-reset")
def reset_password(
    request: PasswordResetRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    service: PasswordRecoveryService = Depends(get_password_recovery_service),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid or expired reset authorization.")
    try:
        service.reset_password(credentials.credentials, request.new_password)
    except ResetAuthorizationError as error:
        raise HTTPException(status_code=401, detail="Invalid or expired reset authorization.") from error
    except PasswordPolicyError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {"message": "Password reset successfully."}


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
        token_auth_version = payload.get("auth_version", 0)

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

    if token_auth_version != (user.auth_version or 0):
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
