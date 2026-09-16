import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import Base  # noqa: E402
from eligibility import check_eligibility  # noqa: E402
from models import PlacementDrive, Student, User  # noqa: E402
from routers import applications  # noqa: E402
from schemas import ApplicationCreate, DriveCreate, StudentCreate  # noqa: E402


def make_student(specially_abled=False, cgpa=8.0):
    return SimpleNamespace(
        cgpa=cgpa,
        tenth_percentage=80.0,
        twelfth_percentage=80.0,
        active_backlogs=0,
        branch="CSE",
        graduation_year=2027,
        gender="Female",
        specially_abled=specially_abled,
    )


def make_drive(pwd_eligibility="Any", min_cgpa=0):
    return SimpleNamespace(
        min_cgpa=min_cgpa,
        min_tenth=0,
        min_twelfth=0,
        max_backlogs=0,
        branches="CSE",
        graduation_year=2027,
        gender="Any",
        pwd_eligibility=pwd_eligibility,
    )


class PwdSchemaTests(unittest.TestCase):
    def test_student_schema_preserves_unknown_pwd_status(self):
        student = StudentCreate(
            name="Unknown PwD Student",
            email="unknown.pwd@example.test",
            roll_no="PWD-UNKNOWN",
            branch="CSE",
            graduation_year=2027,
            cgpa=8.0,
            tenth_percentage=80.0,
            twelfth_percentage=80.0,
            specially_abled=None,
        )
        self.assertIsNone(student.specially_abled)

    def test_drive_create_accepts_any(self):
        drive = DriveCreate(
            company_name="Schema Co",
            role="Engineer",
            pwd_eligibility="Any",
        )
        self.assertEqual(drive.pwd_eligibility, "Any")

    def test_drive_create_accepts_pwd_only(self):
        drive = DriveCreate(
            company_name="Schema Co",
            role="Engineer",
            pwd_eligibility="PwD Only",
        )
        self.assertEqual(drive.pwd_eligibility, "PwD Only")

    def test_drive_create_accepts_non_pwd_only(self):
        drive = DriveCreate(
            company_name="Schema Co",
            role="Engineer",
            pwd_eligibility="Non-PwD Only",
        )
        self.assertEqual(drive.pwd_eligibility, "Non-PwD Only")

    def test_drive_create_rejects_invalid_value(self):
        with self.assertRaises(ValidationError):
            DriveCreate(
                company_name="Schema Co",
                role="Engineer",
                pwd_eligibility="Sometimes",
            )

    def test_drive_create_defaults_to_unrestricted(self):
        drive = DriveCreate(
            company_name="Schema Co",
            role="Engineer",
        )
        self.assertEqual(drive.pwd_eligibility, "Any")


class PwdEligibilityTests(unittest.TestCase):
    def assertEligibility(
        self,
        student_pwd,
        drive_pwd,
        expected,
        expected_reason=None,
    ):
        eligible, reason = check_eligibility(
            make_student(student_pwd),
            make_drive(drive_pwd),
        )
        self.assertEqual(eligible, expected)
        self.assertEqual(reason, expected_reason)

    def test_pwd_student_is_eligible_for_any(self):
        self.assertEligibility(True, "Any", True)

    def test_non_pwd_student_is_eligible_for_any(self):
        self.assertEligibility(False, "Any", True)

    def test_pwd_student_is_eligible_for_pwd_only(self):
        self.assertEligibility(True, "PwD Only", True)

    def test_non_pwd_student_is_ineligible_for_pwd_only(self):
        self.assertEligibility(
            False,
            "PwD Only",
            False,
            "Only PwD candidates are eligible for this drive.",
        )

    def test_pwd_student_is_ineligible_for_non_pwd_only(self):
        self.assertEligibility(
            True,
            "Non-PwD Only",
            False,
            "PwD candidates are not eligible for this drive.",
        )

    def test_non_pwd_student_is_eligible_for_non_pwd_only(self):
        self.assertEligibility(False, "Non-PwD Only", True)

    def test_unknown_pwd_status_is_ineligible_for_restricted_drive(self):
        self.assertEligibility(
            None,
            "PwD Only",
            False,
            "PwD status is required to determine eligibility for this drive.",
        )

    def test_existing_constraints_remain_enforced_with_pwd(self):
        eligible, reason = check_eligibility(
            make_student(True, cgpa=6.0),
            make_drive("PwD Only", min_cgpa=7.0),
        )
        self.assertFalse(eligible)
        self.assertEqual(reason, "Minimum CGPA required: 7.0")


class PwdApplicationApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        self.db = self.session_factory()

        self.student = Student(
            name="PwD Student",
            email="pwd.student@example.test",
            roll_no="PWD001",
            branch="CSE",
            graduation_year=2027,
            cgpa=8.0,
            tenth_percentage=80.0,
            twelfth_percentage=80.0,
            active_backlogs=0,
            gender="Female",
            specially_abled=True,
        )
        self.db.add(self.student)
        self.db.flush()
        self.user = User(
            username="pwd-student",
            password_hash="not-used",
            role="student",
            student_id=self.student.id,
        )
        self.db.add(self.user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def add_drive(self, name, pwd_eligibility, min_cgpa=0):
        drive = PlacementDrive(
            company_name=name,
            role="Engineer",
            status="Published",
            pwd_eligibility=pwd_eligibility,
            min_cgpa=min_cgpa,
        )
        self.db.add(drive)
        self.db.commit()
        return drive

    def apply(self, drive):
        return applications.create_application(
            ApplicationCreate(
                student_id=self.student.id,
                drive_id=drive.id,
            ),
            current_user=self.user,
            db=self.db,
        )

    def test_eligible_pwd_student_can_apply(self):
        drive = self.add_drive("PwD Only Co", "PwD Only")
        application = self.apply(drive)
        self.assertEqual(application.student_id, self.student.id)
        self.assertEqual(application.drive_id, drive.id)

    def test_ineligible_pwd_student_is_rejected_server_side(self):
        drive = self.add_drive("Non-PwD Co", "Non-PwD Only")
        with self.assertRaises(HTTPException) as error:
            self.apply(drive)
        self.assertEqual(error.exception.status_code, 403)
        self.assertEqual(
            error.exception.detail,
            "PwD candidates are not eligible for this drive.",
        )

    def test_other_constraints_still_reject_application(self):
        drive = self.add_drive("High CGPA Co", "Any", min_cgpa=9.0)
        with self.assertRaises(HTTPException) as error:
            self.apply(drive)
        self.assertEqual(error.exception.status_code, 403)
        self.assertEqual(
            error.exception.detail,
            "Minimum CGPA required: 9.0",
        )


if __name__ == "__main__":
    unittest.main()
