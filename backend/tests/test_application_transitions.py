import asyncio
import sys
import tempfile
import threading
import unittest
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from openpyxl import Workbook
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import Query
from sqlalchemy.pool import StaticPool
from starlette.datastructures import UploadFile

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from application_state import ApplicationTransitionError  # noqa: E402
from application_state import initial_application_state  # noqa: E402
from application_state import transition_application  # noqa: E402
from database import Base  # noqa: E402
from models import Application, PlacementDrive, Student, User  # noqa: E402
from routers import applications, drives  # noqa: E402
from routers.auth import require_admin  # noqa: E402


def state(status, current_stage):
    return SimpleNamespace(status=status, current_stage=current_stage)


class CanonicalTransitionTests(unittest.TestCase):
    def assert_transition(
        self,
        source_status,
        source_stage,
        resume_shortlisting,
        target_status,
        target_stage,
    ):
        application = state(source_status, source_stage)
        transition_application(
            application,
            resume_shortlisting,
            target_status,
            target_stage,
        )
        self.assertEqual(application.status, target_status)
        self.assertEqual(application.current_stage, target_stage)

    def assert_invalid(
        self,
        source_status,
        source_stage,
        target_status,
        target_stage,
        resume_shortlisting=True,
    ):
        application = state(source_status, source_stage)
        with self.assertRaises(ApplicationTransitionError):
            transition_application(
                application,
                resume_shortlisting,
                target_status,
                target_stage,
            )
        self.assertEqual(application.status, source_status)
        self.assertEqual(application.current_stage, source_stage)

    def test_resume_drive_initial_state(self):
        initial = initial_application_state(True)
        self.assertEqual(
            (initial.status, initial.current_stage),
            ("Applied", "Resume Shortlisting"),
        )

    def test_no_resume_drive_initial_state(self):
        initial = initial_application_state(False)
        self.assertEqual(
            (initial.status, initial.current_stage),
            ("Applied", "Applied"),
        )

    def test_applied_advances_to_resume_shortlisting(self):
        self.assert_transition(
            "Applied", "Applied", True,
            "Applied", "Resume Shortlisting",
        )

    def test_resume_shortlisting_advances_to_ppt(self):
        self.assert_transition(
            "Applied", "Resume Shortlisting", True,
            "Shortlisted", "PPT",
        )

    def test_ppt_advances_to_online_test(self):
        self.assert_transition(
            "Shortlisted", "PPT", True,
            "Shortlisted", "Online Test",
        )

    def test_online_test_advances_to_interview(self):
        self.assert_transition(
            "Shortlisted", "Online Test", True,
            "Shortlisted", "Interview",
        )

    def test_interview_advances_to_result(self):
        self.assert_transition(
            "Shortlisted", "Interview", True,
            "Shortlisted", "Result",
        )

    def test_result_advances_to_selected(self):
        self.assert_transition(
            "Shortlisted", "Result", True,
            "Selected", "Result",
        )

    def test_no_resume_applied_advances_to_ppt(self):
        self.assert_transition(
            "Applied", "Applied", False,
            "Shortlisted", "PPT",
        )

    def test_applied_to_interview_is_rejected(self):
        self.assert_invalid(
            "Applied", "Applied", "Shortlisted", "Interview"
        )

    def test_ppt_to_selected_is_rejected(self):
        self.assert_invalid(
            "Shortlisted", "PPT", "Selected", "Result"
        )

    def test_rejected_application_is_terminal(self):
        self.assert_invalid(
            "Rejected", "PPT", "Shortlisted", "Online Test"
        )

    def test_selected_application_is_terminal(self):
        self.assert_invalid(
            "Selected", "Result", "Shortlisted", "Interview"
        )

    def test_backward_transition_is_rejected(self):
        self.assert_invalid(
            "Shortlisted", "Interview", "Shortlisted", "Online Test"
        )


class RoundResultAndAuthorizationTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
        )
        Base.metadata.create_all(bind=self.engine)
        self._seed_data()
        self.db = self.session_factory()
        self.admin_user = self.db.query(User).filter(
            User.username == "admin"
        ).one()
        self.student_user = self.db.query(User).filter(
            User.username == "student1"
        ).one()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def _seed_data(self):
        db = self.session_factory()
        students = [
            Student(
                name=f"Student {number}",
                email=f"student{number}@nitrkl.ac.in",
                roll_no=f"24CS{number:03d}",
                branch="CSE",
                graduation_year=2027,
                cgpa=8.0,
                tenth_percentage=80.0,
                twelfth_percentage=80.0,
            )
            for number in range(1, 5)
        ]
        db.add_all(students)
        db.flush()

        no_resume_drive = PlacementDrive(
            company_name="No Resume Co",
            role="Engineer",
            status="Published",
            resume_shortlisting=False,
        )
        other_drive = PlacementDrive(
            company_name="Other Co",
            role="Engineer",
            status="Published",
            resume_shortlisting=False,
        )
        db.add_all([no_resume_drive, other_drive])
        db.flush()

        db.add_all([
            User(
                username="student1",
                password_hash="not-used",
                role="student",
                student_id=students[0].id,
            ),
            User(
                username="admin",
                password_hash="not-used",
                role="admin",
            ),
            Application(
                student_id=students[0].id,
                drive_id=no_resume_drive.id,
                status="Applied",
                current_stage="Applied",
            ),
            Application(
                student_id=students[1].id,
                drive_id=no_resume_drive.id,
                status="Applied",
                current_stage="Applied",
            ),
            Application(
                student_id=students[2].id,
                drive_id=no_resume_drive.id,
                status="Rejected",
                current_stage="PPT",
            ),
            Application(
                student_id=students[3].id,
                drive_id=other_drive.id,
                status="Applied",
                current_stage="Applied",
            ),
        ])
        db.commit()
        self.ids = {
            "no_resume_drive": no_resume_drive.id,
            "other_drive": other_drive.id,
            "students": [student.id for student in students],
        }
        db.close()

    def _workbook_upload(self, roll_numbers):
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.append(["Roll No."])
        for roll_number in roll_numbers:
            worksheet.append([roll_number])
        stream = BytesIO()
        workbook.save(stream)
        workbook.close()
        stream.seek(0)
        return UploadFile(filename="results.xlsx", file=stream)

    def _upload(self, stage, roll_numbers):
        return asyncio.run(
            drives.upload_round_results(
                self.ids["no_resume_drive"],
                stage=stage,
                file=self._workbook_upload(roll_numbers),
                current_user=self.admin_user,
                db=self.db,
            )
        )

    def _application(self, student_index, drive_key="no_resume_drive"):
        return self.db.query(Application).filter(
            Application.student_id == self.ids["students"][student_index],
            Application.drive_id == self.ids[drive_key],
        ).one()

    def _drive_with_application(self, status):
        drive = PlacementDrive(
            company_name=f"{status} Results Co",
            role="Engineer",
            status=status,
            resume_shortlisting=False,
        )
        self.db.add(drive)
        self.db.flush()
        application = Application(
            student_id=self.ids["students"][0],
            drive_id=drive.id,
            status="Applied",
            current_stage="Applied",
        )
        self.db.add(application)
        self.db.commit()
        return drive, application

    def _upload_for_drive(self, drive_id, stage="PPT"):
        return asyncio.run(
            drives.upload_round_results(
                drive_id,
                stage=stage,
                file=self._workbook_upload(["24CS001"]),
                current_user=self.admin_user,
                db=self.db,
            )
        )

    def test_excel_listed_candidate_advances(self):
        result = self._upload("PPT", ["24CS001"])
        application = self._application(0)
        self.assertEqual(result["passed_count"], 1)
        self.assertEqual(application.status, "Shortlisted")
        self.assertEqual(application.current_stage, "Online Test")

    def test_published_drive_accepts_round_results(self):
        result = self._upload("PPT", ["24CS001"])
        self.assertEqual(result["total_processed"], 2)

    def test_round_processing_acquires_database_row_lock(self):
        calls = []
        original = Query.with_for_update

        def track_lock(query, *args, **kwargs):
            calls.append((args, kwargs))
            return original(query, *args, **kwargs)

        with patch.object(
            Query,
            "with_for_update",
            new=track_lock,
        ):
            self._upload("PPT", ["24CS001"])

        self.assertTrue(calls)

    def test_simultaneous_round_processing_has_one_success_and_one_conflict(self):
        with tempfile.TemporaryDirectory() as directory:
            engine = create_engine(
                f"sqlite:///{Path(directory) / 'round-race.db'}",
                connect_args={"check_same_thread": False},
            )
            session_factory = sessionmaker(bind=engine)
            Base.metadata.create_all(engine)
            seed = session_factory()
            student = Student(
                name="Round Race Student",
                email="round.race@nitrkl.ac.in",
                roll_no="ROUND001",
                branch="CSE",
                graduation_year=2027,
                cgpa=8,
                tenth_percentage=80,
                twelfth_percentage=80,
            )
            drive = PlacementDrive(
                company_name="Round Race Co",
                role="Engineer",
                status="Published",
                resume_shortlisting=False,
            )
            seed.add_all([student, drive])
            seed.flush()
            seed.add(
                Application(
                    student_id=student.id,
                    drive_id=drive.id,
                    status="Applied",
                    current_stage="Applied",
                )
            )
            seed.commit()
            drive_id = drive.id
            seed.close()

            initial_reads = threading.Barrier(2)
            drive_lock = threading.Lock()
            outcomes = []

            class LockedDriveQuery:
                def __init__(self, query, owner):
                    self.query = query
                    self.owner = owner
                    self.locked = False

                def filter(self, *criteria):
                    self.query = self.query.filter(*criteria)
                    return self

                def with_for_update(self, *args, **kwargs):
                    self.query = self.query.with_for_update(*args, **kwargs)
                    self.locked = True
                    return self

                def populate_existing(self):
                    self.query = self.query.populate_existing()
                    return self

                def first(self):
                    if self.locked:
                        drive_lock.acquire()
                        self.owner.holds_lock = True
                        self.owner.session.rollback()
                    else:
                        initial_reads.wait(timeout=5)
                    return self.query.first()

            class SerializedSession:
                def __init__(self):
                    self.session = session_factory()
                    self.holds_lock = False

                def query(self, *entities):
                    query = self.session.query(*entities)
                    if entities == (PlacementDrive,):
                        return LockedDriveQuery(query, self)
                    return query

                def _release(self):
                    if self.holds_lock:
                        self.holds_lock = False
                        drive_lock.release()

                def commit(self):
                    try:
                        return self.session.commit()
                    finally:
                        self._release()

                def rollback(self):
                    try:
                        return self.session.rollback()
                    finally:
                        self._release()

                def close(self):
                    self._release()
                    self.session.close()

            def process():
                db = SerializedSession()
                try:
                    result = asyncio.run(
                        drives.upload_round_results(
                            drive_id,
                            stage="PPT",
                            file=self._workbook_upload(["ROUND001"]),
                            current_user=SimpleNamespace(role="admin"),
                            db=db,
                        )
                    )
                    outcomes.append((200, result["total_processed"]))
                except HTTPException as error:
                    outcomes.append((error.status_code, 0))
                finally:
                    db.close()

            threads = [threading.Thread(target=process) for _ in range(2)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join(timeout=10)

            self.assertEqual(sorted(outcomes), [(200, 1), (409, 0)])
            verify = session_factory()
            application = verify.query(Application).one()
            self.assertEqual(
                (application.status, application.current_stage),
                ("Shortlisted", "Online Test"),
            )
            verify.close()
            Base.metadata.drop_all(engine)
            engine.dispose()

    def test_draft_drive_rejects_round_results_without_mutation(self):
        drive, application = self._drive_with_application("Draft")
        before = (application.status, application.current_stage)
        with self.assertRaises(HTTPException) as error:
            self._upload_for_drive(drive.id)
        self.assertEqual(error.exception.status_code, 409)
        self.db.refresh(application)
        self.assertEqual((application.status, application.current_stage), before)

    def test_withdrawn_drive_rejects_round_results_without_mutation(self):
        drive, application = self._drive_with_application("Withdrawn")
        before = (application.status, application.current_stage)
        with self.assertRaises(HTTPException) as error:
            self._upload_for_drive(drive.id)
        self.assertEqual(error.exception.status_code, 409)
        self.db.refresh(application)
        self.assertEqual((application.status, application.current_stage), before)

    def test_excel_absent_candidate_is_rejected(self):
        result = self._upload("PPT", ["24CS001"])
        application = self._application(1)
        self.assertEqual(result["failed_count"], 1)
        self.assertEqual(application.status, "Rejected")
        self.assertEqual(application.current_stage, "PPT")

    def test_excel_other_drive_application_is_unchanged(self):
        self._upload("PPT", ["24CS001"])
        application = self._application(3, "other_drive")
        self.assertEqual(application.status, "Applied")
        self.assertEqual(application.current_stage, "Applied")

    def test_excel_terminal_application_is_unchanged(self):
        self._upload("PPT", ["24CS001", "24CS003"])
        application = self._application(2)
        self.assertEqual(application.status, "Rejected")
        self.assertEqual(application.current_stage, "PPT")

    def test_excel_invalid_stage_is_rejected(self):
        with self.assertRaises(HTTPException) as error:
            self._upload("Technical Interview", ["24CS001"])
        self.assertEqual(error.exception.status_code, 400)

    def test_duplicate_excel_upload_does_not_change_processed_states(self):
        self._upload("PPT", ["24CS001", "24CS002"])
        before = [
            (self._application(index).status, self._application(index).current_stage)
            for index in (0, 1, 2)
        ]
        with self.assertRaises(HTTPException) as error:
            self._upload("PPT", ["24CS001", "24CS002"])
        self.assertEqual(error.exception.status_code, 409)
        after = [
            (self._application(index).status, self._application(index).current_stage)
            for index in (0, 1, 2)
        ]
        self.assertEqual(after, before)

    def test_student_cannot_use_manual_stage_management(self):
        application = self._application(0)
        with self.assertRaises(HTTPException) as error:
            require_admin(self.student_user)
        self.assertEqual(error.exception.status_code, 403)
        self.assertEqual(application.current_stage, "Applied")

    def test_admin_can_perform_valid_manual_transition(self):
        application = self._application(0)
        result = applications.update_application_status(
            application.id,
            status="Shortlisted",
            current_stage="PPT",
            current_user=self.admin_user,
            db=self.db,
        )
        self.assertEqual(result.status, "Shortlisted")
        self.assertEqual(result.current_stage, "PPT")

    def test_admin_manual_jump_is_rejected_without_mutation(self):
        application = self._application(0)
        with self.assertRaises(HTTPException) as error:
            applications.update_application_status(
                application.id,
                status="Shortlisted",
                current_stage="Interview",
                current_user=self.admin_user,
                db=self.db,
            )
        self.assertEqual(error.exception.status_code, 400)
        self.assertEqual(application.status, "Applied")
        self.assertEqual(application.current_stage, "Applied")


if __name__ == "__main__":
    unittest.main()
