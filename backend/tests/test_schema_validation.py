import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

from fastapi import HTTPException
from pydantic import ValidationError

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from routers import drives  # noqa: E402
from schemas import DriveCreate  # noqa: E402
from schemas import DriveUpdate  # noqa: E402
from schemas import StudentCreate  # noqa: E402


def valid_student_data():
    return {
        "name": "Validation Student",
        "email": "validation@example.com",
        "roll_no": "VAL001",
        "branch": "CSE",
        "graduation_year": 2027,
        "cgpa": 8.0,
        "tenth_percentage": 80.0,
        "twelfth_percentage": 80.0,
        "active_backlogs": 0,
    }


def valid_drive_data():
    return {
        "company_name": "Validation Company",
        "role": "Engineer",
    }


class NumericSchemaValidationTests(unittest.TestCase):
    def assert_student_rejected(self, field, value):
        data = valid_student_data()
        data[field] = value

        with self.assertRaises(ValidationError):
            StudentCreate(**data)

    def test_negative_percentage_is_rejected(self):
        self.assert_student_rejected(
            "tenth_percentage",
            -0.01,
        )

    def test_percentage_above_one_hundred_is_rejected(self):
        self.assert_student_rejected(
            "twelfth_percentage",
            100.01,
        )

    def test_negative_cgpa_is_rejected(self):
        self.assert_student_rejected("cgpa", -0.01)

    def test_cgpa_above_ten_is_rejected(self):
        self.assert_student_rejected("cgpa", 10.01)

    def test_negative_backlogs_are_rejected(self):
        self.assert_student_rejected(
            "active_backlogs",
            -1,
        )

        with self.assertRaises(ValidationError):
            DriveUpdate(max_backlogs=-1)

    def test_valid_boundary_values_are_accepted(self):
        low = valid_student_data()
        low.update(
            cgpa=0,
            tenth_percentage=0,
            twelfth_percentage=0,
            active_backlogs=0,
            graduation_year=1900,
        )
        high = valid_student_data()
        high.update(
            cgpa=10,
            tenth_percentage=100,
            twelfth_percentage=100,
            graduation_year=2100,
        )

        StudentCreate(**low)
        StudentCreate(**high)
        DriveUpdate(
            min_cgpa=10,
            min_tenth=100,
            min_twelfth=100,
            max_backlogs=0,
            graduation_year=None,
        )


class DriveTextSchemaValidationTests(unittest.TestCase):
    def assert_create_rejected(self, **overrides):
        data = valid_drive_data()
        data.update(overrides)

        with self.assertRaises(ValidationError):
            DriveCreate(**data)

    def test_blank_company_is_rejected(self):
        self.assert_create_rejected(company_name="")

    def test_whitespace_company_is_rejected(self):
        self.assert_create_rejected(company_name="   ")

    def test_blank_role_is_rejected(self):
        self.assert_create_rejected(role="")

    def test_whitespace_role_is_rejected(self):
        self.assert_create_rejected(role="   ")

    def test_oversized_company_is_rejected(self):
        self.assert_create_rejected(company_name="C" * 151)

    def test_oversized_role_is_rejected(self):
        self.assert_create_rejected(role="R" * 151)

    def test_unsupported_status_is_rejected(self):
        self.assert_create_rejected(status="Archived")

    def test_supported_statuses_are_accepted(self):
        for status in ("Draft", "Published", "Withdrawn"):
            with self.subTest(status=status):
                DriveCreate(**valid_drive_data(), status=status)

    def test_javascript_url_is_rejected(self):
        self.assert_create_rejected(registration_link="javascript:alert(1)")

    def test_data_url_is_rejected(self):
        self.assert_create_rejected(registration_link="data:text/html,test")

    def test_file_url_is_rejected(self):
        self.assert_create_rejected(registration_link="file:///tmp/test")

    def test_malformed_url_is_rejected(self):
        self.assert_create_rejected(registration_link="not a URL")

    def test_valid_https_url_is_accepted(self):
        drive = DriveCreate(
            **valid_drive_data(),
            registration_link="https://careers.example.com/apply",
        )

        self.assertEqual(
            drive.registration_link,
            "https://careers.example.com/apply",
        )

    def test_valid_http_url_is_accepted(self):
        drive = DriveCreate(
            **valid_drive_data(),
            registration_link="http://careers.example.com/apply",
        )

        self.assertEqual(
            drive.registration_link,
            "http://careers.example.com/apply",
        )

    def test_empty_optional_url_is_accepted(self):
        self.assertIsNone(
            DriveCreate(
                **valid_drive_data(),
                registration_link="   ",
            ).registration_link
        )
        self.assertIsNone(
            DriveUpdate(
                registration_link=None
            ).registration_link
        )

    def test_company_and_role_are_trimmed(self):
        drive = DriveCreate(
            company_name="  Validation Company  ",
            role="  Engineer  ",
        )

        self.assertEqual(drive.company_name, "Validation Company")
        self.assertEqual(drive.role, "Engineer")

    def test_update_cannot_bypass_drive_validation(self):
        invalid_updates = (
            {"company_name": "   "},
            {"role": ""},
            {"status": "Archived"},
            {"registration_link": "javascript:alert(1)"},
        )

        for update in invalid_updates:
            with self.subTest(update=tuple(update)):
                with self.assertRaises(ValidationError):
                    DriveUpdate(**update)


class _FailingDriveSession:
    def __init__(self):
        self.rolled_back = False

    def add(self, drive):
        del drive
        raise RuntimeError("secret database connection details")

    def rollback(self):
        self.rolled_back = True


class ExceptionSanitizationTests(unittest.TestCase):
    def test_unexpected_drive_error_is_sanitized(self):
        session = _FailingDriveSession()

        with self.assertRaises(HTTPException) as context:
            drives.create_drive(
                DriveCreate(**valid_drive_data()),
                SimpleNamespace(role="admin"),
                session,
            )

        self.assertEqual(
            context.exception.detail,
            "Failed to create placement drive.",
        )
        self.assertNotIn(
            "secret database",
            context.exception.detail,
        )
        self.assertTrue(session.rolled_back)


if __name__ == "__main__":
    unittest.main()
