import os
import sys
import unittest
from pathlib import Path

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault(
    "JWT_SECRET_KEY",
    "auth-foundation-test-secret",
)

from database import Base  # noqa: E402
from models import Student, User  # noqa: E402
from routers.auth import (  # noqa: E402
    ForgotPasswordRequest,
    INVALID_LOGIN_DETAIL,
    LoginRequest,
    forgot_password,
    get_current_user,
    hash_password,
    login,
)
from schemas import StudentProfileUpdate  # noqa: E402


class DirectResult:
    def __init__(
        self,
        status_code,
        data,
    ):
        self.status_code = status_code
        self.data = data

    def json(self):
        return self.data


class AuthenticationFoundationTests(
    unittest.TestCase
):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={
                "check_same_thread": False,
            },
            poolclass=StaticPool,
        )

        cls.Session = sessionmaker(
            bind=cls.engine,
        )

        Base.metadata.create_all(
            cls.engine
        )

        with cls.Session() as db:
            student = Student(
                name="Auth Student",
                email="student@nitrkl.ac.in",
                roll_no="AUTH001",
                mobile="9876543210",
                branch="CSE",
                graduation_year=2027,
                cgpa=8.5,
                tenth_percentage=90,
                twelfth_percentage=88,
            )
            db.add(student)
            db.flush()

            db.add_all(
                [
                    User(
                        username="student1",
                        password_hash=hash_password(
                            "student-password"
                        ),
                        role="student",
                        student_id=student.id,
                    ),
                    User(
                        username="admin",
                        password_hash=hash_password(
                            "admin-password"
                        ),
                        role="admin",
                    ),
                ]
            )
            db.commit()

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(
            cls.engine
        )
        cls.engine.dispose()

    def login(
        self,
        identifier,
        password="student-password",
        role="student",
    ):
        with self.Session() as db:
            try:
                result = login(
                    LoginRequest(
                        identifier=identifier,
                        password=password,
                        role=role,
                    ),
                    db,
                )
            except HTTPException as error:
                return DirectResult(
                    error.status_code,
                    {
                        "detail": error.detail,
                    },
                )

        return DirectResult(
            200,
            result,
        )

    def request_recovery(
        self,
        identifier,
    ):
        with self.Session() as db:
            result = forgot_password(
                ForgotPasswordRequest(
                    identifier=identifier,
                ),
                db,
            )

        return DirectResult(
            200,
            result,
        )

    def test_student_college_email_login_succeeds(
        self,
    ):
        response = self.login(
            "student@nitrkl.ac.in"
        )

        self.assertEqual(
            response.status_code,
            200,
        )
        self.assertEqual(
            response.json()["user"].role,
            "student",
        )

    def test_student_email_is_trimmed_and_lowercased(
        self,
    ):
        response = self.login(
            "  STUDENT@NITRKL.AC.IN  "
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_valid_indian_mobile_login_succeeds(
        self,
    ):
        response = self.login(
            "9876543210"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_plus_91_mobile_login_is_normalized(
        self,
    ):
        response = self.login(
            "+919876543210"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_profile_mobile_is_stored_canonically(
        self,
    ):
        update = StudentProfileUpdate(
            mobile="+91 98765-43210"
        )

        self.assertEqual(
            update.mobile,
            "9876543210",
        )

    def test_invalid_profile_mobile_is_rejected(
        self,
    ):
        with self.assertRaises(ValueError):
            StudentProfileUpdate(
                mobile="1234567890"
            )

    def test_invalid_mobile_is_rejected(
        self,
    ):
        response = self.login(
            "1234567890"
        )

        self.assertEqual(
            response.status_code,
            401,
        )
        self.assertEqual(
            response.json()["detail"],
            INVALID_LOGIN_DETAIL,
        )

    def test_wrong_password_returns_generic_error(
        self,
    ):
        response = self.login(
            "student@nitrkl.ac.in",
            password="wrong-password",
        )

        self.assertEqual(
            response.status_code,
            401,
        )
        self.assertEqual(
            response.json()["detail"],
            INVALID_LOGIN_DETAIL,
        )

    def test_unknown_identifier_returns_same_error(
        self,
    ):
        response = self.login(
            "unknown@nitrkl.ac.in"
        )

        self.assertEqual(
            response.status_code,
            401,
        )
        self.assertEqual(
            response.json()["detail"],
            INVALID_LOGIN_DETAIL,
        )

    def test_admin_existing_username_login_succeeds(
        self,
    ):
        response = self.login(
            "ADMIN",
            password="admin-password",
            role="admin",
        )

        self.assertEqual(
            response.status_code,
            200,
        )
        self.assertEqual(
            response.json()["user"].role,
            "admin",
        )

    def test_role_mismatch_uses_generic_error(
        self,
    ):
        response = self.login(
            "admin",
            password="admin-password",
            role="student",
        )

        self.assertEqual(
            response.status_code,
            401,
        )
        self.assertEqual(
            response.json()["detail"],
            INVALID_LOGIN_DETAIL,
        )

    def test_non_nitr_email_is_rejected_for_student(
        self,
    ):
        response = self.login(
            "student@example.com"
        )

        self.assertEqual(
            response.status_code,
            401,
        )

    def test_malformed_identifier_is_rejected_cleanly(
        self,
    ):
        response = self.login(
            "invalid identifier!"
        )

        self.assertEqual(
            response.status_code,
            401,
        )
        self.assertEqual(
            response.json()["detail"],
            INVALID_LOGIN_DETAIL,
        )

    def test_empty_identifier_is_rejected_cleanly(
        self,
    ):
        response = self.login(
            "   "
        )

        self.assertEqual(
            response.status_code,
            401,
        )

    def test_student_username_login_remains_supported(
        self,
    ):
        response = self.login(
            "student1"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

    def test_logged_in_token_still_supports_me(
        self,
    ):
        login_response = self.login(
            "student@nitrkl.ac.in"
        )
        token = login_response.json()[
            "access_token"
        ]

        with self.Session() as db:
            current_user = get_current_user(
                HTTPAuthorizationCredentials(
                    scheme="Bearer",
                    credentials=token,
                ),
                db,
            )

        self.assertEqual(
            current_user.role,
            "student",
        )

    def test_forgot_password_responses_are_indistinguishable(
        self,
    ):
        known = self.request_recovery(
            "student@nitrkl.ac.in"
        )
        unknown = self.request_recovery(
            "unknown@nitrkl.ac.in"
        )

        self.assertEqual(
            known.status_code,
            200,
        )
        self.assertEqual(
            unknown.status_code,
            200,
        )
        self.assertEqual(
            known.json(),
            unknown.json(),
        )


if __name__ == "__main__":
    unittest.main()
