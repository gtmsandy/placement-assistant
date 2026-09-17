import hashlib
import hmac
import logging
import os
import secrets as secure_random
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth_identifiers import InvalidIdentifier, normalize_identifier
from models import OtpChallenge, Student, User
from password_security import hash_password, validate_new_password, verify_password
from providers.base import OtpDeliveryProvider


logger = logging.getLogger(__name__)

PURPOSE = "password_recovery"
GENERIC_RECOVERY_MESSAGE = (
    "If an account matches that email address, recovery instructions have been sent."
)
INVALID_CODE_MESSAGE = "Invalid or expired code."
OTP_DIGITS = 6
OTP_TTL = timedelta(minutes=10)
MAX_ATTEMPTS = 5
RESEND_COOLDOWN = timedelta(seconds=60)
MAX_RESENDS = 3
MAX_REQUESTS_PER_HOUR = 5
RESET_TOKEN_TTL = timedelta(minutes=10)
RESET_TOKEN_TYPE = "password_reset"
RESET_ALGORITHM = "HS256"


class RecoveryConfigurationError(RuntimeError):
    pass


class RecoveryCodeError(ValueError):
    pass


class RecoveryRateLimitError(ValueError):
    def __init__(self, retry_after: int):
        super().__init__("Please wait before requesting another code.")
        self.retry_after = max(1, retry_after)


class ResetAuthorizationError(ValueError):
    pass


class PasswordPolicyError(ValueError):
    pass


@dataclass(frozen=True)
class RecoverySecrets:
    otp_hash: str
    identifier_hash: str
    reset_token: str

    @classmethod
    def from_environment(cls) -> "RecoverySecrets":
        values = {
            "otp_hash": os.getenv("OTP_HASH_SECRET"),
            "identifier_hash": os.getenv("IDENTIFIER_HASH_SECRET"),
            "reset_token": os.getenv("PASSWORD_RESET_SECRET"),
        }
        missing = [name for name, value in values.items() if not value]
        if missing:
            raise RecoveryConfigurationError(
                "Password recovery is not configured."
            )
        return cls(**values)


@dataclass(frozen=True)
class RecoveryRequestResult:
    challenge_id: uuid.UUID
    message: str = GENERIC_RECOVERY_MESSAGE
    retry_after_seconds: int = int(RESEND_COOLDOWN.total_seconds())


@dataclass(frozen=True)
class RecoveryVerifyResult:
    reset_token: str
    expires_in_seconds: int = int(RESET_TOKEN_TTL.total_seconds())


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=timezone.utc)


def _hmac_digest(secret: str, value: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        value.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _generate_otp() -> str:
    return f"{secure_random.randbelow(10 ** OTP_DIGITS):0{OTP_DIGITS}d}"


class PasswordRecoveryService:
    def __init__(
        self,
        db: Session,
        recovery_secrets: RecoverySecrets,
        provider: OtpDeliveryProvider,
        now_factory: Callable[[], datetime] = _utc_now,
    ):
        self.db = db
        self.recovery_secrets = recovery_secrets
        self.provider = provider
        self.now_factory = now_factory

    def _fingerprint(self, identifier: str) -> str:
        return _hmac_digest(
            self.recovery_secrets.identifier_hash,
            identifier,
        )

    def _otp_digest(self, challenge_id: uuid.UUID, code: str) -> str:
        return _hmac_digest(
            self.recovery_secrets.otp_hash,
            f"{challenge_id}:{code}",
        )

    def _jti_digest(self, jti: str) -> str:
        return _hmac_digest(self.recovery_secrets.reset_token, jti)

    def _resolve_student_contact(
        self,
        raw_identifier: str,
    ) -> tuple[str, str, User | None, str | None, str]:
        try:
            normalized = normalize_identifier(raw_identifier, role="student")
        except InvalidIdentifier:
            normalized = None

        if normalized is None or normalized.kind != "email":
            canonical = raw_identifier.strip().lower() or "invalid"
            return self._fingerprint(canonical), "unknown", None, None, "none"

        query = self.db.query(User).join(Student, User.student_id == Student.id)
        query = query.filter(func.lower(Student.email) == normalized.value)

        matches = query.filter(func.lower(User.role) == "student").limit(2).all()
        user = matches[0] if len(matches) == 1 else None
        destination = normalized.value if user is not None else None
        return (
            self._fingerprint(f"{normalized.kind}:{normalized.value}"),
            normalized.kind,
            user,
            destination,
            "email" if user is not None else "none",
        )

    def _deliver(
        self,
        challenge: OtpChallenge,
        destination: str | None,
        code: str,
    ) -> None:
        if challenge.user_id is None or destination is None:
            challenge.delivery_status = "suppressed"
            self.db.commit()
            return

        try:
            result = self.provider.send_otp(
                destination=destination,
                code=code,
                purpose=PURPOSE,
                expires_in_seconds=int(OTP_TTL.total_seconds()),
                idempotency_key=str(challenge.id),
            )
            challenge.delivery_status = "sent" if result.accepted else "failed"
        except Exception:
            logger.warning(
                "Password recovery email delivery failed; challenge_id=%s provider=%s",
                challenge.id,
                type(self.provider).__name__,
            )
            challenge.delivery_status = "failed"
        self.db.commit()

    def request(self, identifier: str) -> RecoveryRequestResult:
        now = self.now_factory()
        fingerprint, kind, user, destination, channel = self._resolve_student_contact(
            identifier
        )
        active = (
            self.db.query(OtpChallenge)
            .filter(
                OtpChallenge.identifier_fingerprint == fingerprint,
                OtpChallenge.purpose == PURPOSE,
                OtpChallenge.consumed_at.is_(None),
                OtpChallenge.invalidated_at.is_(None),
            )
            .first()
        )
        if active is not None:
            elapsed = now - _aware(active.last_sent_at)
            if elapsed < RESEND_COOLDOWN:
                remaining = int((RESEND_COOLDOWN - elapsed).total_seconds())
                return RecoveryRequestResult(active.id, retry_after_seconds=max(1, remaining))
            active.invalidated_at = now

        recent_count = (
            self.db.query(OtpChallenge)
            .filter(
                OtpChallenge.identifier_fingerprint == fingerprint,
                OtpChallenge.purpose == PURPOSE,
                OtpChallenge.created_at >= now - timedelta(hours=1),
            )
            .count()
        )
        if recent_count >= MAX_REQUESTS_PER_HOUR:
            raise RecoveryRateLimitError(int(RESEND_COOLDOWN.total_seconds()))

        challenge_id = uuid.uuid4()
        code = _generate_otp()
        challenge = OtpChallenge(
            id=challenge_id,
            user_id=user.id if user is not None else None,
            identifier_fingerprint=fingerprint,
            identifier_kind=kind,
            purpose=PURPOSE,
            channel=channel,
            otp_digest=self._otp_digest(challenge_id, code),
            created_at=now,
            expires_at=now + OTP_TTL,
            last_sent_at=now,
            delivery_status="pending",
        )
        self.db.add(challenge)
        self.db.commit()
        self._deliver(challenge, destination, code)
        return RecoveryRequestResult(challenge.id)

    def resend(self, challenge_id: uuid.UUID) -> RecoveryRequestResult:
        now = self.now_factory()
        challenge = (
            self.db.query(OtpChallenge)
            .filter(OtpChallenge.id == challenge_id, OtpChallenge.purpose == PURPOSE)
            .with_for_update()
            .first()
        )
        if challenge is None or challenge.consumed_at or challenge.invalidated_at:
            raise RecoveryCodeError(INVALID_CODE_MESSAGE)
        elapsed = now - _aware(challenge.last_sent_at)
        if elapsed < RESEND_COOLDOWN:
            remaining = int((RESEND_COOLDOWN - elapsed).total_seconds())
            raise RecoveryRateLimitError(max(1, remaining))
        if challenge.resend_count >= MAX_RESENDS:
            challenge.invalidated_at = now
            self.db.commit()
            raise RecoveryRateLimitError(int(RESEND_COOLDOWN.total_seconds()))

        destination = None
        if challenge.user_id is not None:
            row = (
                self.db.query(User, Student)
                .join(Student, User.student_id == Student.id)
                .filter(User.id == challenge.user_id)
                .first()
            )
            if row is not None and challenge.identifier_kind == "email":
                _, student = row
                destination = student.email

        code = _generate_otp()
        challenge.otp_digest = self._otp_digest(challenge.id, code)
        challenge.expires_at = now + OTP_TTL
        challenge.last_sent_at = now
        challenge.resend_count += 1
        challenge.attempts = 0
        challenge.delivery_status = "pending"
        self.db.commit()
        self._deliver(challenge, destination, code)
        return RecoveryRequestResult(challenge.id)

    def verify(self, challenge_id: uuid.UUID, code: str) -> RecoveryVerifyResult:
        now = self.now_factory()
        challenge = (
            self.db.query(OtpChallenge)
            .filter(OtpChallenge.id == challenge_id, OtpChallenge.purpose == PURPOSE)
            .with_for_update()
            .first()
        )
        valid_state = (
            challenge is not None
            and challenge.user_id is not None
            and challenge.delivery_status == "sent"
            and challenge.consumed_at is None
            and challenge.invalidated_at is None
            and challenge.verified_at is None
            and _aware(challenge.expires_at) > now
            and challenge.attempts < MAX_ATTEMPTS
        )
        if not valid_state:
            raise RecoveryCodeError(INVALID_CODE_MESSAGE)

        candidate = self._otp_digest(challenge.id, code)
        if not hmac.compare_digest(challenge.otp_digest, candidate):
            challenge.attempts += 1
            if challenge.attempts >= MAX_ATTEMPTS:
                challenge.invalidated_at = now
            self.db.commit()
            raise RecoveryCodeError(INVALID_CODE_MESSAGE)

        jti = secure_random.token_urlsafe(32)
        expires = now + RESET_TOKEN_TTL
        challenge.verified_at = now
        challenge.reset_jti_digest = self._jti_digest(jti)
        challenge.reset_authorized_until = expires
        self.db.commit()
        token = jwt.encode(
            {
                "sub": str(challenge.user_id),
                "type": RESET_TOKEN_TYPE,
                "purpose": PURPOSE,
                "challenge_id": str(challenge.id),
                "jti": jti,
                "iat": now,
                "exp": expires,
            },
            self.recovery_secrets.reset_token,
            algorithm=RESET_ALGORITHM,
        )
        return RecoveryVerifyResult(token)

    def reset_password(self, token: str, new_password: str) -> User:
        try:
            payload = jwt.decode(
                token,
                self.recovery_secrets.reset_token,
                algorithms=[RESET_ALGORITHM],
            )
            if payload.get("type") != RESET_TOKEN_TYPE or payload.get("purpose") != PURPOSE:
                raise ResetAuthorizationError()
            user_id = int(payload["sub"])
            challenge_id = uuid.UUID(payload["challenge_id"])
            jti = payload["jti"]
        except (JWTError, KeyError, TypeError, ValueError):
            raise ResetAuthorizationError("Invalid or expired reset authorization.")

        now = self.now_factory()
        challenge = (
            self.db.query(OtpChallenge)
            .filter(OtpChallenge.id == challenge_id, OtpChallenge.user_id == user_id)
            .with_for_update()
            .first()
        )
        valid = (
            challenge is not None
            and challenge.verified_at is not None
            and challenge.consumed_at is None
            and challenge.invalidated_at is None
            and challenge.reset_jti_digest is not None
            and challenge.reset_authorized_until is not None
            and _aware(challenge.reset_authorized_until) > now
            and hmac.compare_digest(challenge.reset_jti_digest, self._jti_digest(jti))
        )
        if not valid:
            raise ResetAuthorizationError("Invalid or expired reset authorization.")

        try:
            validate_new_password(new_password)
        except ValueError as error:
            raise PasswordPolicyError(str(error))

        user = self.db.query(User).filter(User.id == user_id).with_for_update().first()
        if user is None:
            raise ResetAuthorizationError("Invalid or expired reset authorization.")
        if verify_password(new_password, user.password_hash):
            raise PasswordPolicyError("New password must be different from the current password.")

        user.password_hash = hash_password(new_password)
        user.auth_version = (user.auth_version or 0) + 1
        user.password_changed_at = now
        challenge.consumed_at = now
        (
            self.db.query(OtpChallenge)
            .filter(
                OtpChallenge.user_id == user.id,
                OtpChallenge.purpose == PURPOSE,
                OtpChallenge.id != challenge.id,
                OtpChallenge.consumed_at.is_(None),
                OtpChallenge.invalidated_at.is_(None),
            )
            .update({OtpChallenge.invalidated_at: now}, synchronize_session=False)
        )
        self.db.commit()
        self.db.refresh(user)
        return user
