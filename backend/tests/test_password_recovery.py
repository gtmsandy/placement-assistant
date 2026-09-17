import os
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("JWT_SECRET_KEY", "password-recovery-access-test-secret")

from database import Base  # noqa: E402
from models import OtpChallenge, Student, User  # noqa: E402
from password_recovery import (  # noqa: E402
    INVALID_CODE_MESSAGE,
    MAX_ATTEMPTS,
    MAX_RESENDS,
    PasswordPolicyError,
    PasswordRecoveryService,
    RecoveryCodeError,
    RecoveryRateLimitError,
    RecoverySecrets,
    ResetAuthorizationError,
)
from password_security import hash_password, verify_password  # noqa: E402
from providers.fake import FakeOtpProvider  # noqa: E402
from routers.auth import (  # noqa: E402
    LoginRequest,
    create_access_token,
    get_current_user,
    login,
)


ORIGINAL_PASSWORD = "original-password"
NEW_PASSWORD = "new-secure-password"
ORIGINAL_HASH = hash_password(ORIGINAL_PASSWORD)


class MutableClock:
    def __init__(self):
        self.value = datetime.now(timezone.utc)

    def __call__(self):
        return self.value

    def advance(self, **kwargs):
        self.value += timedelta(**kwargs)


class PasswordRecoveryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.Session = sessionmaker(bind=cls.engine)
        cls.secrets = RecoverySecrets(
            otp_hash="otp-test-secret",
            identifier_hash="identifier-test-secret",
            reset_token="reset-token-test-secret",
        )

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()

    def setUp(self):
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)
        self.db = self.Session()
        student = Student(
            name="Recovery Student",
            email="recovery@nitrkl.ac.in",
            roll_no="REC001",
            mobile="9876543210",
            branch="CSE",
            graduation_year=2027,
            cgpa=8.5,
            tenth_percentage=90,
            twelfth_percentage=88,
        )
        self.db.add(student)
        self.db.flush()
        self.user = User(
            username="recovery-student",
            password_hash=ORIGINAL_HASH,
            role="student",
            student_id=student.id,
            auth_version=0,
        )
        self.admin = User(
            username="recovery-admin",
            password_hash=ORIGINAL_HASH,
            role="admin",
            auth_version=0,
        )
        self.db.add_all([self.user, self.admin])
        self.db.commit()
        self.clock = MutableClock()
        self.provider = FakeOtpProvider()
        self.service = PasswordRecoveryService(
            self.db,
            self.secrets,
            self.provider,
            self.clock,
        )

    def tearDown(self):
        self.db.close()

    def request(self, identifier="recovery@nitrkl.ac.in"):
        result = self.service.request(identifier)
        code = self.provider.deliveries[-1].code if self.provider.deliveries else None
        return result, code

    def verified_token(self):
        result, code = self.request()
        return result, self.service.verify(result.challenge_id, code).reset_token

    def test_valid_otp_is_verified_and_plaintext_is_not_persisted(self):
        result, code = self.request()
        verified = self.service.verify(result.challenge_id, code)
        challenge = self.db.get(OtpChallenge, result.challenge_id)
        self.assertTrue(verified.reset_token)
        self.assertIsNotNone(challenge.verified_at)
        self.assertNotEqual(challenge.otp_digest, code)

    def test_verified_otp_cannot_be_verified_twice(self):
        result, code = self.request()
        self.service.verify(result.challenge_id, code)
        with self.assertRaises(RecoveryCodeError):
            self.service.verify(result.challenge_id, code)

    def test_wrong_otp_uses_generic_error_and_increments_attempts(self):
        result, _ = self.request()
        with self.assertRaisesRegex(RecoveryCodeError, INVALID_CODE_MESSAGE):
            self.service.verify(result.challenge_id, "000000")
        self.assertEqual(self.db.get(OtpChallenge, result.challenge_id).attempts, 1)

    def test_expired_otp_is_rejected(self):
        result, code = self.request()
        self.clock.advance(minutes=11)
        with self.assertRaises(RecoveryCodeError):
            self.service.verify(result.challenge_id, code)

    def test_consumed_otp_cannot_be_verified_again(self):
        result, token = self.verified_token()
        self.service.reset_password(token, NEW_PASSWORD)
        with self.assertRaises(RecoveryCodeError):
            self.service.verify(result.challenge_id, self.provider.deliveries[-1].code)

    def test_invalidated_otp_is_rejected(self):
        result, code = self.request()
        challenge = self.db.get(OtpChallenge, result.challenge_id)
        challenge.invalidated_at = self.clock()
        self.db.commit()
        with self.assertRaises(RecoveryCodeError):
            self.service.verify(result.challenge_id, code)

    def test_new_request_supersedes_old_challenge(self):
        first, first_code = self.request()
        self.clock.advance(seconds=61)
        second, _ = self.request()
        self.assertNotEqual(first.challenge_id, second.challenge_id)
        with self.assertRaises(RecoveryCodeError):
            self.service.verify(first.challenge_id, first_code)

    def test_max_attempts_invalidates_challenge(self):
        result, _ = self.request()
        for _ in range(MAX_ATTEMPTS):
            with self.assertRaises(RecoveryCodeError):
                self.service.verify(result.challenge_id, "000000")
        self.assertIsNotNone(self.db.get(OtpChallenge, result.challenge_id).invalidated_at)

    def test_resend_cooldown_is_enforced(self):
        result, _ = self.request()
        with self.assertRaises(RecoveryRateLimitError):
            self.service.resend(result.challenge_id)

    def test_max_resends_is_enforced(self):
        result, _ = self.request()
        for _ in range(MAX_RESENDS):
            self.clock.advance(seconds=61)
            self.service.resend(result.challenge_id)
        self.clock.advance(seconds=61)
        with self.assertRaises(RecoveryRateLimitError):
            self.service.resend(result.challenge_id)

    def test_old_otp_is_invalid_after_resend(self):
        result, old_code = self.request()
        self.clock.advance(seconds=61)
        self.service.resend(result.challenge_id)
        new_code = self.provider.deliveries[-1].code
        with self.assertRaises(RecoveryCodeError):
            self.service.verify(result.challenge_id, old_code)
        self.assertTrue(self.service.verify(result.challenge_id, new_code).reset_token)

    def test_known_and_unknown_requests_have_equivalent_response_shape(self):
        known, _ = self.request()
        unknown = self.service.request("unknown@nitrkl.ac.in")
        self.assertEqual(type(known), type(unknown))
        self.assertEqual(known.message, unknown.message)
        self.assertEqual(known.retry_after_seconds, unknown.retry_after_seconds)

    def test_unknown_request_is_suppressed_without_delivery(self):
        result = self.service.request("unknown@nitrkl.ac.in")
        challenge = self.db.get(OtpChallenge, result.challenge_id)
        self.assertIsNone(challenge.user_id)
        self.assertEqual(challenge.delivery_status, "suppressed")

    def test_mobile_request_uses_normalized_destination(self):
        self.service.request("+91 98765-43210")
        self.assertEqual(self.provider.deliveries[-1].destination, "9876543210")

    def test_fake_provider_success_is_recorded(self):
        result, _ = self.request()
        self.assertEqual(self.db.get(OtpChallenge, result.challenge_id).delivery_status, "sent")
        self.assertEqual(len(self.provider.deliveries), 1)

    def test_fake_provider_failure_is_safely_recorded(self):
        self.provider.accepted = False
        result, _ = self.request()
        self.assertEqual(self.db.get(OtpChallenge, result.challenge_id).delivery_status, "failed")

    def test_provider_exception_is_sanitized(self):
        self.service.provider = FakeOtpProvider(exception=RuntimeError("provider credential detail"))
        result = self.service.request("recovery@nitrkl.ac.in")
        self.assertEqual(self.db.get(OtpChallenge, result.challenge_id).delivery_status, "failed")

    def test_expired_reset_authorization_is_rejected(self):
        _, token = self.verified_token()
        self.clock.advance(minutes=11)
        with self.assertRaises(ResetAuthorizationError):
            self.service.reset_password(token, NEW_PASSWORD)

    def test_wrong_reset_token_type_is_rejected(self):
        token = jwt.encode(
            {"sub": str(self.user.id), "type": "access", "exp": datetime.now(timezone.utc) + timedelta(minutes=5)},
            self.secrets.reset_token,
            algorithm="HS256",
        )
        with self.assertRaises(ResetAuthorizationError):
            self.service.reset_password(token, NEW_PASSWORD)

    def test_reset_token_replay_is_rejected(self):
        _, token = self.verified_token()
        self.service.reset_password(token, NEW_PASSWORD)
        with self.assertRaises(ResetAuthorizationError):
            self.service.reset_password(token, "another-secure-password")

    def test_reset_jti_mismatch_is_rejected(self):
        result, token = self.verified_token()
        challenge = self.db.get(OtpChallenge, result.challenge_id)
        challenge.reset_jti_digest = "0" * 64
        self.db.commit()
        with self.assertRaises(ResetAuthorizationError):
            self.service.reset_password(token, NEW_PASSWORD)

    def test_weak_password_is_rejected(self):
        _, token = self.verified_token()
        with self.assertRaises(PasswordPolicyError):
            self.service.reset_password(token, "short")

    def test_password_over_72_bytes_is_rejected(self):
        _, token = self.verified_token()
        with self.assertRaises(PasswordPolicyError):
            self.service.reset_password(token, "é" * 37)

    def test_current_password_is_rejected(self):
        _, token = self.verified_token()
        with self.assertRaises(PasswordPolicyError):
            self.service.reset_password(token, ORIGINAL_PASSWORD)

    def test_successful_reset_changes_password_and_version(self):
        _, token = self.verified_token()
        user = self.service.reset_password(token, NEW_PASSWORD)
        self.assertFalse(verify_password(ORIGINAL_PASSWORD, user.password_hash))
        self.assertTrue(verify_password(NEW_PASSWORD, user.password_hash))
        self.assertEqual(user.auth_version, 1)
        self.assertIsNotNone(user.password_changed_at)

    def test_old_access_token_is_invalid_after_reset_and_new_token_works(self):
        old_token = create_access_token(self.user.id, "student", 0)
        _, reset_token = self.verified_token()
        user = self.service.reset_password(reset_token, NEW_PASSWORD)
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=old_token)
        with self.assertRaises(HTTPException):
            get_current_user(credentials, self.db)
        new_token = create_access_token(user.id, user.role, user.auth_version)
        current = get_current_user(
            HTTPAuthorizationCredentials(scheme="Bearer", credentials=new_token),
            self.db,
        )
        self.assertEqual(current.id, user.id)

    def test_reset_token_is_not_accepted_as_access_token(self):
        _, reset_token = self.verified_token()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=reset_token)
        with self.assertRaises(HTTPException):
            get_current_user(credentials, self.db)

    def test_reset_invalidates_other_active_recovery_challenges(self):
        email_result, email_code = self.request()
        mobile_result = self.service.request("9876543210")
        token = self.service.verify(email_result.challenge_id, email_code).reset_token
        self.service.reset_password(token, NEW_PASSWORD)
        mobile_challenge = self.db.get(OtpChallenge, mobile_result.challenge_id)
        self.assertIsNotNone(mobile_challenge.invalidated_at)

    def test_student_email_and_mobile_login_regression(self):
        for identifier in ("recovery@nitrkl.ac.in", "+919876543210"):
            result = login(LoginRequest(identifier=identifier, password=ORIGINAL_PASSWORD, role="student"), self.db)
            self.assertEqual(result["user"].id, self.user.id)

    def test_admin_login_regression(self):
        result = login(
            LoginRequest(identifier="recovery-admin", password=ORIGINAL_PASSWORD, role="admin"),
            self.db,
        )
        self.assertEqual(result["user"].id, self.admin.id)


if __name__ == "__main__":
    unittest.main()
