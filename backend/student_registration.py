import hmac
import logging
import secrets as secure_random
import uuid
from dataclasses import dataclass
from datetime import timedelta
from typing import Callable

import jwt
from jwt import PyJWTError as JWTError
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth_identifiers import InvalidIdentifier, normalize_identifier, normalize_optional_mobile
from models import OtpChallenge, Student, User
from password_recovery import (
    MAX_ATTEMPTS,
    MAX_REQUESTS_PER_HOUR,
    MAX_RESENDS,
    OTP_TTL,
    RESEND_COOLDOWN,
    RESET_ALGORITHM,
    RESET_TOKEN_TTL,
    RecoverySecrets,
    _aware,
    _generate_otp,
    _hmac_digest,
    _utc_now,
)
from password_security import hash_password, validate_new_password
from providers.base import OtpDeliveryProvider


logger = logging.getLogger(__name__)

PURPOSE = "student_registration"
TOKEN_TYPE = "student_registration"
INVALID_CODE_MESSAGE = "Invalid or expired code."
GENERIC_MESSAGE = "Verification instructions have been sent."


class RegistrationValidationError(ValueError):
    pass


class RegistrationConflictError(ValueError):
    pass


class RegistrationCodeError(ValueError):
    pass


class RegistrationRateLimitError(ValueError):
    def __init__(self, retry_after: int):
        super().__init__("Please wait before requesting another code.")
        self.retry_after = max(1, retry_after)


class RegistrationAuthorizationError(ValueError):
    pass


@dataclass(frozen=True)
class RegistrationDetails:
    name: str
    roll_no: str
    password: str
    mobile: str | None
    branch: str
    graduation_year: int
    cgpa: float
    tenth_percentage: float
    twelfth_percentage: float
    active_backlogs: int
    history_of_backlogs: bool
    gender: str
    specially_abled: bool


@dataclass(frozen=True)
class RegistrationRequestResult:
    challenge_id: uuid.UUID
    message: str = GENERIC_MESSAGE
    retry_after_seconds: int = int(RESEND_COOLDOWN.total_seconds())


@dataclass(frozen=True)
class RegistrationVerifyResult:
    registration_token: str
    expires_in_seconds: int = int(RESET_TOKEN_TTL.total_seconds())


class StudentRegistrationService:
    def __init__(
        self,
        db: Session,
        secrets: RecoverySecrets,
        provider: OtpDeliveryProvider,
        now_factory: Callable = _utc_now,
    ):
        self.db = db
        self.secrets = secrets
        self.provider = provider
        self.now_factory = now_factory

    def _fingerprint(self, email: str) -> str:
        return _hmac_digest(self.secrets.identifier_hash, f"email:{email}")

    def _otp_digest(self, challenge_id: uuid.UUID, code: str) -> str:
        return _hmac_digest(self.secrets.otp_hash, f"{challenge_id}:{code}")

    def _jti_digest(self, jti: str) -> str:
        return _hmac_digest(self.secrets.reset_token, jti)

    def _normalize_email(self, raw_email: str) -> str:
        try:
            normalized = normalize_identifier(raw_email, role="student")
        except InvalidIdentifier as error:
            raise RegistrationValidationError(
                "Use a valid NITR college email address."
            ) from error
        if normalized.kind != "email":
            raise RegistrationValidationError(
                "Use a valid NITR college email address."
            )
        return normalized.value

    def _account_exists(self, email: str) -> bool:
        student_exists = self.db.query(Student.id).filter(
            func.lower(Student.email) == email
        ).first()
        user_exists = self.db.query(User.id).filter(
            func.lower(User.username) == email
        ).first()
        return student_exists is not None or user_exists is not None

    def _deliver(self, challenge: OtpChallenge, code: str) -> None:
        if not challenge.registration_email:
            challenge.delivery_status = "suppressed"
            self.db.commit()
            return
        try:
            result = self.provider.send_otp(
                destination=challenge.registration_email,
                code=code,
                purpose=PURPOSE,
                expires_in_seconds=int(OTP_TTL.total_seconds()),
                idempotency_key=str(challenge.id),
            )
            challenge.delivery_status = "sent" if result.accepted else "failed"
        except Exception:
            logger.warning(
                "Registration email delivery failed; challenge_id=%s provider=%s",
                challenge.id,
                type(self.provider).__name__,
            )
            challenge.delivery_status = "failed"
        self.db.commit()

    def request(self, raw_email: str) -> RegistrationRequestResult:
        email = self._normalize_email(raw_email)
        account_exists = self._account_exists(email)

        now = self.now_factory()
        fingerprint = self._fingerprint(email)
        active = self.db.query(OtpChallenge).filter(
            OtpChallenge.identifier_fingerprint == fingerprint,
            OtpChallenge.purpose == PURPOSE,
            OtpChallenge.consumed_at.is_(None),
            OtpChallenge.invalidated_at.is_(None),
        ).first()
        if active is not None:
            elapsed = now - _aware(active.last_sent_at)
            if elapsed < RESEND_COOLDOWN:
                remaining = int((RESEND_COOLDOWN - elapsed).total_seconds())
                return RegistrationRequestResult(
                    active.id,
                    retry_after_seconds=max(1, remaining),
                )
            active.invalidated_at = now

        recent_count = self.db.query(OtpChallenge).filter(
            OtpChallenge.identifier_fingerprint == fingerprint,
            OtpChallenge.purpose == PURPOSE,
            OtpChallenge.created_at >= now - timedelta(hours=1),
        ).count()
        if recent_count >= MAX_REQUESTS_PER_HOUR:
            raise RegistrationRateLimitError(int(RESEND_COOLDOWN.total_seconds()))

        challenge_id = uuid.uuid4()
        code = _generate_otp()
        challenge = OtpChallenge(
            id=challenge_id,
            user_id=None,
            registration_email=(
                None
                if account_exists
                else email
            ),
            identifier_fingerprint=fingerprint,
            identifier_kind="email",
            purpose=PURPOSE,
            channel=(
                "none"
                if account_exists
                else "email"
            ),
            otp_digest=self._otp_digest(challenge_id, code),
            created_at=now,
            expires_at=now + OTP_TTL,
            last_sent_at=now,
            delivery_status="pending",
        )
        self.db.add(challenge)
        try:
            self.db.commit()
        except IntegrityError as error:
            self.db.rollback()
            raise RegistrationRateLimitError(
                int(RESEND_COOLDOWN.total_seconds())
            ) from error
        self._deliver(challenge, code)
        return RegistrationRequestResult(challenge.id)

    def resend(self, challenge_id: uuid.UUID) -> RegistrationRequestResult:
        now = self.now_factory()
        challenge = self.db.query(OtpChallenge).filter(
            OtpChallenge.id == challenge_id,
            OtpChallenge.purpose == PURPOSE,
        ).with_for_update().first()
        if (
            challenge is None
            or challenge.consumed_at
            or challenge.invalidated_at
            or not challenge.registration_email
        ):
            raise RegistrationCodeError(INVALID_CODE_MESSAGE)
        elapsed = now - _aware(challenge.last_sent_at)
        if elapsed < RESEND_COOLDOWN:
            remaining = int((RESEND_COOLDOWN - elapsed).total_seconds())
            raise RegistrationRateLimitError(max(1, remaining))
        if challenge.resend_count >= MAX_RESENDS:
            challenge.invalidated_at = now
            self.db.commit()
            raise RegistrationRateLimitError(int(RESEND_COOLDOWN.total_seconds()))

        code = _generate_otp()
        challenge.otp_digest = self._otp_digest(challenge.id, code)
        challenge.expires_at = now + OTP_TTL
        challenge.last_sent_at = now
        challenge.resend_count += 1
        challenge.attempts = 0
        challenge.delivery_status = "pending"
        self.db.commit()
        self._deliver(challenge, code)
        return RegistrationRequestResult(challenge.id)

    def verify(self, challenge_id: uuid.UUID, code: str) -> RegistrationVerifyResult:
        now = self.now_factory()
        challenge = self.db.query(OtpChallenge).filter(
            OtpChallenge.id == challenge_id,
            OtpChallenge.purpose == PURPOSE,
        ).with_for_update().first()
        valid = (
            challenge is not None
            and challenge.registration_email is not None
            and challenge.delivery_status == "sent"
            and challenge.consumed_at is None
            and challenge.invalidated_at is None
            and challenge.verified_at is None
            and _aware(challenge.expires_at) > now
            and challenge.attempts < MAX_ATTEMPTS
        )
        if not valid:
            raise RegistrationCodeError(INVALID_CODE_MESSAGE)

        candidate = self._otp_digest(challenge.id, code)
        if not hmac.compare_digest(challenge.otp_digest, candidate):
            challenge.attempts += 1
            if challenge.attempts >= MAX_ATTEMPTS:
                challenge.invalidated_at = now
            self.db.commit()
            raise RegistrationCodeError(INVALID_CODE_MESSAGE)

        jti = secure_random.token_urlsafe(32)
        expires = now + RESET_TOKEN_TTL
        challenge.verified_at = now
        challenge.reset_jti_digest = self._jti_digest(jti)
        challenge.reset_authorized_until = expires
        self.db.commit()
        token = jwt.encode(
            {
                "sub": challenge.registration_email,
                "type": TOKEN_TYPE,
                "purpose": PURPOSE,
                "challenge_id": str(challenge.id),
                "jti": jti,
                "iat": now,
                "exp": expires,
            },
            self.secrets.reset_token,
            algorithm=RESET_ALGORITHM,
        )
        return RegistrationVerifyResult(token)

    def complete(self, token: str, details: RegistrationDetails) -> User:
        try:
            payload = jwt.decode(
                token,
                self.secrets.reset_token,
                algorithms=[RESET_ALGORITHM],
            )
            if payload.get("type") != TOKEN_TYPE or payload.get("purpose") != PURPOSE:
                raise RegistrationAuthorizationError()
            email = self._normalize_email(payload["sub"])
            challenge_id = uuid.UUID(payload["challenge_id"])
            jti = payload["jti"]
        except (JWTError, KeyError, TypeError, ValueError):
            raise RegistrationAuthorizationError(
                "Invalid or expired registration authorization."
            )

        now = self.now_factory()
        try:
            challenge = self.db.query(OtpChallenge).filter(
                OtpChallenge.id == challenge_id,
                OtpChallenge.purpose == PURPOSE,
            ).with_for_update().first()
            valid = (
                challenge is not None
                and challenge.registration_email == email
                and challenge.verified_at is not None
                and challenge.consumed_at is None
                and challenge.invalidated_at is None
                and challenge.reset_jti_digest is not None
                and challenge.reset_authorized_until is not None
                and _aware(challenge.reset_authorized_until) > now
                and hmac.compare_digest(
                    challenge.reset_jti_digest,
                    self._jti_digest(jti),
                )
            )
            if not valid:
                raise RegistrationAuthorizationError(
                    "Invalid or expired registration authorization."
                )

            try:
                validate_new_password(details.password)
            except ValueError as error:
                raise RegistrationValidationError(str(error)) from error
            name = details.name.strip()
            roll_no = details.roll_no.strip().upper()
            branch = details.branch.strip()
            gender = details.gender.strip()
            if not name or not roll_no or not branch or not gender:
                raise RegistrationValidationError(
                    "Name, roll number, branch and gender are required."
                )
            mobile = normalize_optional_mobile(details.mobile)
            duplicate = self.db.query(Student.id).filter(
                (func.lower(Student.email) == email)
                | (func.lower(Student.roll_no) == roll_no.lower())
                | (Student.mobile == mobile if mobile else False)
            ).first()
            username_taken = self.db.query(User.id).filter(
                func.lower(User.username) == email
            ).first()
            if duplicate is not None or username_taken is not None:
                raise RegistrationConflictError(
                    "An account already exists with those details."
                )

            student = Student(
                name=name,
                email=email,
                email_verified_at=challenge.verified_at,
                roll_no=roll_no,
                mobile=mobile,
                personal_email=None,
                branch=branch,
                graduation_year=details.graduation_year,
                cgpa=details.cgpa,
                tenth_percentage=details.tenth_percentage,
                twelfth_percentage=details.twelfth_percentage,
                active_backlogs=details.active_backlogs,
                history_of_backlogs=details.history_of_backlogs,
                gender=gender,
                specially_abled=details.specially_abled,
            )
            self.db.add(student)
            self.db.flush()
            user = User(
                username=email,
                password_hash=hash_password(details.password),
                role="student",
                student_id=student.id,
                auth_version=0,
            )
            self.db.add(user)
            challenge.consumed_at = now
            self.db.commit()
            self.db.refresh(user)
            return user
        except RegistrationAuthorizationError:
            self.db.rollback()
            raise
        except RegistrationConflictError:
            self.db.rollback()
            raise
        except IntegrityError as error:
            self.db.rollback()
            raise RegistrationConflictError(
                "An account already exists with those details."
            ) from error
        except Exception:
            self.db.rollback()
            raise
