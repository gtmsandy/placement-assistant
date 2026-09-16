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
