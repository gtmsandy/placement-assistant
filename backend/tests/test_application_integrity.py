import sys
import unittest
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import Base  # noqa: E402
from models import Application, PlacementDrive, Student, User  # noqa: E402
from routers import applications  # noqa: E402
from schemas import ApplicationCreate  # noqa: E402


class _NoDuplicatePrecheckQuery:
    def __init__(self, query):
        self.query = query

    def filter(self, *criteria):
        self.query = self.query.filter(*criteria)
        return self

    def first(self):
        return None


class _RaceSession:
    """Delegate to a real session while simulating a missed pre-check."""

    def __init__(self, session):
        self.session = session
        self.application_query_seen = False

    def query(self, *entities):
        query = self.session.query(*entities)
        if entities == (Application,) and not self.application_query_seen:
            self.application_query_seen = True
            return _NoDuplicatePrecheckQuery(query)
        return query

    def __getattr__(self, name):
        return getattr(self.session, name)


class ApplicationIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, connection_record):
            del connection_record
            cursor = connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        self.session_factory = sessionmaker(bind=self.engine)
        Base.metadata.create_all(bind=self.engine)
        self.db = self.session_factory()

        self.student = Student(
            name="Integrity Student",
            email="integrity@nitrkl.ac.in",
            roll_no="24CS900",
            branch="CSE",
            graduation_year=2027,
            cgpa=8.0,
            tenth_percentage=80.0,
            twelfth_percentage=80.0,
        )
        self.drive = PlacementDrive(
            company_name="Integrity Co",
            role="Engineer",
            status="Published",
            resume_shortlisting=False,
        )
        self.admin = User(
            username="integrity-admin",
            password_hash="not-used",
            role="admin",
        )
        self.db.add_all([self.student, self.drive, self.admin])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def _add_application(self, student_id=None, drive_id=None):
        application = Application(
            student_id=(student_id if student_id is not None else self.student.id),
            drive_id=(drive_id if drive_id is not None else self.drive.id),
            status="Applied",
            current_stage="Applied",
        )
        self.db.add(application)
        self.db.commit()
        return application

    def test_valid_application_succeeds(self):
        application = self._add_application()
        self.assertIsNotNone(application.id)

    def test_duplicate_student_drive_is_rejected(self):
        self._add_application()
        self.db.add(Application(
            student_id=self.student.id,
            drive_id=self.drive.id,
            status="Applied",
            current_stage="Applied",
        ))
        with self.assertRaises(IntegrityError):
            self.db.commit()
        self.db.rollback()

    def test_invalid_student_foreign_key_is_rejected(self):
        with self.assertRaises(IntegrityError):
            self._add_application(student_id=999999)
        self.db.rollback()

    def test_invalid_drive_foreign_key_is_rejected(self):
        with self.assertRaises(IntegrityError):
            self._add_application(drive_id=999999)
        self.db.rollback()

    def test_duplicate_api_precheck_returns_400(self):
        self._add_application()
        with self.assertRaises(HTTPException) as error:
            applications.create_application(
                ApplicationCreate(
                    student_id=self.student.id,
                    drive_id=self.drive.id,
                ),
                current_user=self.admin,
                db=self.db,
            )
        self.assertEqual(error.exception.status_code, 400)

    def test_duplicate_race_fallback_returns_409(self):
        self._add_application()
        race_session = _RaceSession(self.db)
        with self.assertRaises(HTTPException) as error:
            applications.create_application(
                ApplicationCreate(
                    student_id=self.student.id,
                    drive_id=self.drive.id,
                ),
                current_user=self.admin,
                db=race_session,
            )
        self.assertEqual(error.exception.status_code, 409)
        self.assertFalse(self.db.in_transaction())


if __name__ == "__main__":
    unittest.main()
