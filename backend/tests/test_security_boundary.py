import sys
import unittest
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import Base, get_db  # noqa: E402
from models import Application, PlacementDrive, Student, User  # noqa: E402
from routers import applications, drives, students  # noqa: E402
from routers.auth import hash_password, require_admin  # noqa: E402
from schemas import ApplicationCreate, StudentProfileUpdate  # noqa: E402


class SecurityBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.session_factory = sessionmaker(
            autocommit=False, autoflush=False, bind=self.engine
        )
        Base.metadata.create_all(bind=self.engine)
        self._seed_data()
        self.db = self.session_factory()
        self.student_user = self.db.query(User).filter(
            User.username == "student1"
        ).one()
        self.admin_user = self.db.query(User).filter(
            User.username == "admin"
        ).one()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def _seed_data(self):
        db = self.session_factory()
        student_one = Student(
            name="Student One", email="one@nitrkl.ac.in", roll_no="24CS001",
            branch="CSE", graduation_year=2027, cgpa=8.0,
            tenth_percentage=80.0, twelfth_percentage=80.0,
        )
        student_two = Student(
            name="Student Two", email="two@nitrkl.ac.in", roll_no="24CS002",
            branch="ECE", graduation_year=2027, cgpa=8.0,
            tenth_percentage=80.0, twelfth_percentage=80.0,
        )
        db.add_all([student_one, student_two])
        db.flush()
        db.add_all([
            User(username="student1", password_hash=hash_password("password"),
                 role="student", student_id=student_one.id),
            User(username="student2", password_hash=hash_password("password"),
                 role="student", student_id=student_two.id),
            User(username="admin", password_hash=hash_password("password"),
                 role="admin"),
        ])
        published = PlacementDrive(
            company_name="Published Co", role="Engineer", status="Published"
        )
        draft = PlacementDrive(
            company_name="Draft Co", role="Engineer", status="Draft"
        )
        withdrawn = PlacementDrive(
            company_name="Withdrawn Co", role="Engineer", status="Withdrawn"
        )
        db.add_all([published, draft, withdrawn])
        db.flush()
        db.add_all([
            Application(student_id=student_one.id, drive_id=published.id,
                        status="Applied", current_stage="Applied"),
            Application(student_id=student_two.id, drive_id=published.id,
                        status="Applied", current_stage="Applied"),
        ])
        db.commit()
        self.ids = {
            "student_one": student_one.id, "student_two": student_two.id,
            "published": published.id, "draft": draft.id,
            "withdrawn": withdrawn.id,
        }
        db.close()

    def test_student_list_excludes_draft_and_withdrawn_drives(self):
        drives_result = drives.get_drives(
            current_user=self.student_user, db=self.db
        )
        self.assertEqual(
            {drive.status for drive in drives_result}, {"Published"}
        )

    def test_student_cannot_list_draft_drives(self):
        drives_result = drives.get_drives(
            current_user=self.student_user, db=self.db
        )
        self.assertNotIn("Draft", {drive.status for drive in drives_result})

    def test_student_cannot_list_withdrawn_drives(self):
        drives_result = drives.get_drives(
            current_user=self.student_user, db=self.db
        )
        self.assertNotIn(
            "Withdrawn", {drive.status for drive in drives_result}
        )

    def test_student_cannot_access_draft_drive_by_id(self):
        self._assert_student_cannot_access_drive("draft")

    def test_student_cannot_access_withdrawn_drive_by_id(self):
        self._assert_student_cannot_access_drive("withdrawn")

    def _assert_student_cannot_access_drive(self, drive_key):
        with self.assertRaises(HTTPException) as error:
            drives.get_drive(
                self.ids[drive_key],
                current_user=self.student_user,
                db=self.db,
            )
        self.assertEqual(error.exception.status_code, 404)

    def test_admin_can_access_all_drive_statuses(self):
        drives_result = drives.get_drives(
            current_user=self.admin_user, db=self.db
        )
        self.assertEqual(
            {drive.status for drive in drives_result},
            {"Published", "Draft", "Withdrawn"},
        )

    def test_student_profile_update_ignores_eligibility_fields(self):
        result = students.update_student(
            self.ids["student_one"],
            StudentProfileUpdate.model_validate({
                "cgpa": 10.0, "branch": "CSE", "tenth_percentage": 99.0,
                "twelfth_percentage": 99.0, "active_backlogs": 0,
                "history_of_backlogs": True, "graduation_year": 2030,
                "gender": "Other", "specially_abled": True,
            }),
            current_user=self.student_user,
            db=self.db,
        )
        self.assertEqual(result.cgpa, 8.0)
        self.assertEqual(result.branch, "CSE")
        self.assertEqual(result.tenth_percentage, 80.0)
        self.assertEqual(result.twelfth_percentage, 80.0)
        self.assertEqual(result.graduation_year, 2027)
        self.assertFalse(result.history_of_backlogs)
        self.assertFalse(result.specially_abled)

    def test_student_can_update_contact_fields(self):
        result = students.update_student(
            self.ids["student_one"],
            StudentProfileUpdate(
                mobile="9876543210",
                personal_email="one.personal@example.com",
            ),
            current_user=self.student_user,
            db=self.db,
        )
        self.assertEqual(result.mobile, "9876543210")
        self.assertEqual(result.personal_email, "one.personal@example.com")

    def test_student_cannot_update_another_student_profile(self):
        with self.assertRaises(HTTPException) as error:
            students.update_student(
                self.ids["student_two"],
                StudentProfileUpdate(mobile="9876543210"),
                current_user=self.student_user,
                db=self.db,
            )
        self.assertEqual(error.exception.status_code, 403)

    def test_student_cannot_create_application_for_another_student(self):
        with self.assertRaises(HTTPException) as error:
            applications.create_application(
                ApplicationCreate(
                    student_id=self.ids["student_two"],
                    drive_id=self.ids["published"],
                ),
                current_user=self.student_user,
                db=self.db,
            )
        self.assertEqual(error.exception.status_code, 403)

    def test_student_only_retrieves_own_applications(self):
        result = applications.get_applications(
            current_user=self.student_user, db=self.db
        )
        self.assertEqual(
            {item.student_id for item in result},
            {self.ids["student_one"]},
        )

    def test_admin_can_retrieve_all_applications(self):
        result = applications.get_applications(
            current_user=self.admin_user, db=self.db
        )
        self.assertEqual(
            {item.student_id for item in result},
            {self.ids["student_one"], self.ids["student_two"]},
        )

    def test_student_cannot_use_admin_application_management_dependency(self):
        with self.assertRaises(HTTPException) as error:
            require_admin(self.student_user)
        self.assertEqual(error.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
