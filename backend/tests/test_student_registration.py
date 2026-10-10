import os
import sys
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault("JWT_SECRET_KEY", "registration-access-test-secret")

from database import Base  # noqa: E402
from models import OtpChallenge, Student, User  # noqa: E402
from password_recovery import PasswordRecoveryService, RecoveryCodeError, RecoverySecrets  # noqa: E402
from password_security import verify_password  # noqa: E402
from providers.fake import FakeOtpProvider  # noqa: E402
from routers.auth import (  # noqa: E402
    RegistrationCompleteRequest,
    RegistrationEmailRequest,
    complete_student_registration,
    get_current_user,
    request_student_registration,
)
from student_registration import (  # noqa: E402
    MAX_ATTEMPTS,
    MAX_RESENDS,
    RegistrationAuthorizationError,
    RegistrationCodeError,
    RegistrationConflictError,
    RegistrationDetails,
    RegistrationRateLimitError,
    RegistrationValidationError,
    StudentRegistrationService,
)


REGISTRATION_PASSWORD = "registration-password"


class MutableClock:
    def __init__(self):
        self.value = datetime.now(timezone.utc)

    def __call__(self):
        return self.value

    def advance(self, **kwargs):
        self.value += timedelta(**kwargs)


class StudentRegistrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.Session = sessionmaker(bind=cls.engine)
        cls.secrets = RecoverySecrets(
            otp_hash="registration-otp-test-secret",
            identifier_hash="registration-identifier-test-secret",
            reset_token="registration-token-test-secret",
        )

    @classmethod
    def tearDownClass(cls):
        cls.engine.dispose()

    def setUp(self):
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)
        self.db = self.Session()
        self.clock = MutableClock()
        self.provider = FakeOtpProvider()
        self.service = StudentRegistrationService(
            self.db,
            self.secrets,
            self.provider,
            self.clock,
        )

    def tearDown(self):
        self.db.close()

    def details(self, **overrides):
        values = {
            "name": "Registration Student",
            "roll_no": "REG001",
            "password": REGISTRATION_PASSWORD,
            "mobile": "9876543210",
            "branch": "CSE",
            "graduation_year": 2027,
            "cgpa": 8.5,
            "tenth_percentage": 90,
            "twelfth_percentage": 88,
            "active_backlogs": 0,
            "history_of_backlogs": False,
            "gender": "Any",
            "specially_abled": False,
        }
        values.update(overrides)
        return RegistrationDetails(**values)

    def request(self, email="new.student@nitrkl.ac.in"):
        result = self.service.request(email)
        code = self.provider.deliveries[-1].code
        return result, code

    def verified_token(self, email="new.student@nitrkl.ac.in"):
        result, code = self.request(email)
        verified = self.service.verify(result.challenge_id, code)
        return result, verified.registration_token

    def add_student(self, *, email="existing@nitrkl.ac.in", roll_no="EXIST001", mobile=None):
        student = Student(
            name="Existing Student",
            email=email,
            roll_no=roll_no,
            mobile=mobile,
            branch="CSE",
            graduation_year=2027,
            cgpa=8,
            tenth_percentage=80,
            twelfth_percentage=80,
        )
        self.db.add(student)
        self.db.flush()
        user = User(
            username=email,
            password_hash="not-used",
            role="student",
            student_id=student.id,
        )
        self.db.add(user)
        self.db.commit()
        return student, user

    def test_valid_nitr_email_is_normalized_and_otp_is_sent(self):
        result, code = self.request("  NEW.STUDENT@NITRKL.AC.IN  ")
        challenge = self.db.get(OtpChallenge, result.challenge_id)

        self.assertEqual(challenge.registration_email, "new.student@nitrkl.ac.in")
        self.assertEqual(challenge.purpose, "student_registration")
        self.assertNotEqual(challenge.otp_digest, code)
        self.assertEqual(self.provider.deliveries[-1].destination, "new.student@nitrkl.ac.in")
        self.assertEqual(self.provider.deliveries[-1].purpose, "student_registration")

    def test_non_nitr_and_fake_suffix_emails_are_rejected(self):
        for email in ("student@gmail.com", "student@nitrkl.ac.in.xyz"):
            with self.subTest(email=email):
                with self.assertRaises(RegistrationValidationError):
                    self.service.request(email)
        self.assertEqual(self.provider.deliveries, [])

    def test_account_is_not_created_before_verification(self):
        self.request()
        self.assertEqual(self.db.query(Student).count(), 0)
        self.assertEqual(self.db.query(User).count(), 0)

    def test_existing_email_is_blocked(self):
        self.add_student()
        with self.assertRaises(RegistrationConflictError):
            self.service.request(" EXISTING@NITRKL.AC.IN ")

    def test_invalid_otp_increments_attempts(self):
        result, _ = self.request()
        with self.assertRaises(RegistrationCodeError):
            self.service.verify(result.challenge_id, "000000")
        self.assertEqual(self.db.get(OtpChallenge, result.challenge_id).attempts, 1)

    def test_expired_otp_is_rejected(self):
        result, code = self.request()
        self.clock.advance(minutes=11)
        with self.assertRaises(RegistrationCodeError):
            self.service.verify(result.challenge_id, code)

    def test_attempt_limit_invalidates_challenge(self):
        result, _ = self.request()
        for _ in range(MAX_ATTEMPTS):
            with self.assertRaises(RegistrationCodeError):
                self.service.verify(result.challenge_id, "000000")
        self.assertIsNotNone(self.db.get(OtpChallenge, result.challenge_id).invalidated_at)

    def test_resend_cooldown_is_enforced(self):
        result, _ = self.request()
        with self.assertRaises(RegistrationRateLimitError):
            self.service.resend(result.challenge_id)

    def test_max_resends_is_enforced(self):
        result, _ = self.request()
        for _ in range(MAX_RESENDS):
            self.clock.advance(seconds=61)
            self.service.resend(result.challenge_id)
        self.clock.advance(seconds=61)
        with self.assertRaises(RegistrationRateLimitError):
            self.service.resend(result.challenge_id)

    def test_old_otp_is_invalid_after_resend(self):
        result, old_code = self.request()
        self.clock.advance(seconds=61)
        self.service.resend(result.challenge_id)
        new_code = self.provider.deliveries[-1].code
        with self.assertRaises(RegistrationCodeError):
            self.service.verify(result.challenge_id, old_code)
        self.assertTrue(self.service.verify(result.challenge_id, new_code).registration_token)

    def test_registration_challenge_cannot_verify_as_password_recovery(self):
        result, code = self.request()
        recovery = PasswordRecoveryService(
            self.db,
            self.secrets,
            FakeOtpProvider(),
            self.clock,
        )
        with self.assertRaises(RecoveryCodeError):
            recovery.verify(result.challenge_id, code)

    def test_password_recovery_challenge_cannot_verify_as_registration(self):
        now = self.clock()
        challenge = OtpChallenge(
            id=uuid.uuid4(),
            user_id=None,
            identifier_fingerprint="f" * 64,
            identifier_kind="email",
            purpose="password_recovery",
            channel="email",
            otp_digest="d" * 64,
            created_at=now,
            expires_at=now + timedelta(minutes=10),
            last_sent_at=now,
            delivery_status="sent",
        )
        self.db.add(challenge)
        self.db.commit()
        with self.assertRaises(RegistrationCodeError):
            self.service.verify(challenge.id, "123456")

    def test_registration_otp_can_only_be_verified_once(self):
        result, code = self.request()
        self.service.verify(result.challenge_id, code)
        with self.assertRaises(RegistrationCodeError):
            self.service.verify(result.challenge_id, code)

    def test_registration_token_expires(self):
        _, token = self.verified_token()
        self.clock.advance(minutes=11)
        with self.assertRaises(RegistrationAuthorizationError):
            self.service.complete(token, self.details())

    def test_successful_completion_creates_verified_student_and_linked_user(self):
        _, token = self.verified_token()
        user = self.service.complete(token, self.details())
        student = self.db.get(Student, user.student_id)

        self.assertEqual(user.role, "student")
        self.assertEqual(user.username, "new.student@nitrkl.ac.in")
        self.assertEqual(student.email, "new.student@nitrkl.ac.in")
        self.assertIsNotNone(student.email_verified_at)
        self.assertTrue(verify_password(REGISTRATION_PASSWORD, user.password_hash))

    def test_duplicate_roll_number_is_blocked(self):
        _, token = self.verified_token()
        self.add_student(roll_no="REG001")
        with self.assertRaises(RegistrationConflictError):
            self.service.complete(token, self.details())

    def test_duplicate_mobile_is_blocked(self):
        _, token = self.verified_token()
        self.add_student(roll_no="OTHER001", mobile="9876543210")
        with self.assertRaises(RegistrationConflictError):
            self.service.complete(token, self.details())

    def test_registration_token_replay_is_blocked(self):
        _, token = self.verified_token()
        self.service.complete(token, self.details())
        with self.assertRaises(RegistrationAuthorizationError):
            self.service.complete(token, self.details(roll_no="REG002", mobile="9876543211"))

    def test_account_creation_rolls_back_if_user_creation_fails(self):
        _, token = self.verified_token()
        original_add = self.db.add

        def fail_for_user(value):
            if isinstance(value, User):
                raise RuntimeError("simulated user creation failure")
            original_add(value)

        with patch.object(self.db, "add", side_effect=fail_for_user):
            with self.assertRaises(RuntimeError):
                self.service.complete(token, self.details())

        self.assertEqual(self.db.query(Student).count(), 0)
        self.assertEqual(self.db.query(User).count(), 0)

    def test_registration_token_is_not_an_access_token(self):
        _, token = self.verified_token()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        with self.assertRaises(HTTPException):
            get_current_user(credentials, self.db)

    def test_registration_request_endpoint_rejects_gmail(self):
        with self.assertRaises(HTTPException) as captured:
            request_student_registration(
                RegistrationEmailRequest(email="student@gmail.com"),
                self.service,
            )
        self.assertEqual(captured.exception.status_code, 422)

    def test_registration_completion_does_not_accept_role(self):
        with self.assertRaises(ValidationError):
            RegistrationCompleteRequest(
                name="Registration Student",
                roll_no="REG001",
                password=REGISTRATION_PASSWORD,
                mobile="9876543210",
                branch="CSE",
                graduation_year=2027,
                cgpa=8.5,
                tenth_percentage=90,
                twelfth_percentage=88,
                active_backlogs=0,
                history_of_backlogs=False,
                gender="Any",
                specially_abled=False,
                role="admin",
            )

    def test_registration_completion_requires_authorization(self):
        request = RegistrationCompleteRequest(**self.details().__dict__)
        with self.assertRaises(HTTPException) as captured:
            complete_student_registration(request, None, self.service)
        self.assertEqual(captured.exception.status_code, 401)


if __name__ == "__main__":
    unittest.main()
