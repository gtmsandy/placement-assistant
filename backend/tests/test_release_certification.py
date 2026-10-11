import asyncio
import io
import os
import sys
import tempfile
import unittest
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace

from fastapi import HTTPException, UploadFile
from fastapi.security import HTTPAuthorizationCredentials
import jwt
from openpyxl import Workbook
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.datastructures import Headers
from starlette.routing import Mount


BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault(
    "JWT_SECRET_KEY",
    "release-certification-test-secret",
)

from application_state import (  # noqa: E402
    ApplicationTransitionError,
    transition_application,
)
from auth_identifiers import (  # noqa: E402
    InvalidIdentifier,
    normalize_identifier,
)
from database import Base, get_db  # noqa: E402
from eligibility import check_eligibility  # noqa: E402
from main import app  # noqa: E402
from models import (  # noqa: E402
    Application,
    PlacementDrive,
    Student,
    User,
)
from routers import drives  # noqa: E402
from routers.auth import (  # noqa: E402
    ALGORITHM,
    LoginRequest,
    RegistrationCompleteRequest,
    SECRET_KEY,
    TOKEN_TYPE,
    create_access_token,
    get_current_user,
    hash_password,
    require_admin,
    require_student,
)
from upload_security import (  # noqa: E402
    MAX_EXCEL_SIZE,
    MAX_RESUME_SIZE,
    read_upload_with_limit,
    validate_resume_content,
)


XLSX_MIME = (
    "application/vnd.openxmlformats-officedocument."
    "spreadsheetml.sheet"
)
XLSM_MIME = "application/vnd.ms-excel.sheet.macroenabled.12"


def make_upload(filename, contents, content_type):
    return UploadFile(
        file=io.BytesIO(contents),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


def workbook_bytes(header, values):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append([header])
    for value in values:
        worksheet.append([value])
    stream = io.BytesIO()
    workbook.save(stream)
    workbook.close()
    return stream.getvalue()


class IdentifierBoundaryTests(unittest.TestCase):
    def test_student_mobile_with_spaces_and_hyphens_is_normalized(self):
        result = normalize_identifier(
            "+91 98765-43210",
            role="student",
        )
        self.assertEqual((result.kind, result.value), ("mobile", "9876543210"))

    def test_uppercase_student_email_and_outer_spaces_are_normalized(self):
        result = normalize_identifier(
            "  QA.STUDENT@NITRKL.AC.IN  ",
            role="student",
        )
        self.assertEqual(result.value, "qa.student@nitrkl.ac.in")

    def test_fake_suffix_and_subdomain_tricks_are_rejected(self):
        for identifier in (
            "qa@nitrkl.ac.in.example.com",
            "qa@dept.nitrkl.ac.in",
        ):
            with self.subTest(identifier=identifier):
                with self.assertRaises(InvalidIdentifier):
                    normalize_identifier(identifier, role="student")

    def test_gmail_sql_and_html_inputs_do_not_become_student_identifiers(self):
        for identifier in (
            "qa@gmail.com",
            "' OR 1=1 --",
            "<script>alert(1)</script>",
        ):
            with self.subTest(identifier=identifier):
                with self.assertRaises(InvalidIdentifier):
                    normalize_identifier(identifier, role="student")


class JwtAndHttpBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.Session = sessionmaker(bind=cls.engine)
        Base.metadata.create_all(cls.engine)
        with cls.Session() as db:
            student = Student(
                name="QA JWT Student",
                email="qa.jwt@nitrkl.ac.in",
                roll_no="QA_JWT_001",
                mobile="9876543210",
                branch="CSE",
                graduation_year=2027,
                cgpa=8.0,
                tenth_percentage=80.0,
                twelfth_percentage=80.0,
            )
            db.add(student)
            db.flush()
            cls.student_id = student.id
            student_user = User(
                username="qa.jwt.student",
                password_hash=hash_password("qa-student-password"),
                role="student",
                student_id=student.id,
            )
            admin_user = User(
                username="qa.admin@example.com",
                password_hash=hash_password("qa-admin-password"),
                role="admin",
            )
            db.add_all([student_user, admin_user])
            db.commit()
            cls.student_user_id = student_user.id
            cls.admin_user_id = admin_user.id

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(cls.engine)
        cls.engine.dispose()

    def credentials(self, token, scheme="Bearer"):
        return HTTPAuthorizationCredentials(scheme=scheme, credentials=token)

    def assert_unauthorized_token(self, token, scheme="Bearer"):
        with self.Session() as db:
            with self.assertRaises(HTTPException) as error:
                get_current_user(self.credentials(token, scheme), db)
        self.assertEqual(error.exception.status_code, 401)

    def test_no_token_and_wrong_authorization_scheme_are_rejected(self):
        with self.Session() as db:
            with self.assertRaises(HTTPException) as error:
                get_current_user(None, db)
        self.assertEqual(error.exception.status_code, 401)
        valid = create_access_token(self.student_user_id, "student", 0)
        self.assert_unauthorized_token(valid, scheme="Basic")

    def test_random_tampered_expired_and_wrong_secret_tokens_are_rejected(self):
        valid = create_access_token(self.student_user_id, "student", 0)
        tampered = valid[:-1] + ("a" if valid[-1] != "a" else "b")
        now = datetime.now(timezone.utc)
        expired = jwt.encode(
            {
                "sub": str(self.student_user_id),
                "role": "student",
                "type": TOKEN_TYPE,
                "auth_version": 0,
                "iat": now - timedelta(hours=2),
                "exp": now - timedelta(hours=1),
            },
            SECRET_KEY,
            algorithm=ALGORITHM,
        )
        wrong_secret = jwt.encode(
            {
                "sub": str(self.student_user_id),
                "type": TOKEN_TYPE,
                "auth_version": 0,
                "exp": now + timedelta(hours=1),
            },
            "different-test-secret-at-least-32-bytes",
            algorithm=ALGORITHM,
        )
        for token in ("not-a-jwt", tampered, expired, wrong_secret):
            with self.subTest(token_kind=len(token)):
                self.assert_unauthorized_token(token)

    def test_wrong_token_type_nonexistent_user_and_auth_version_are_rejected(self):
        now = datetime.now(timezone.utc)
        payloads = (
            {
                "sub": str(self.student_user_id),
                "type": "password_reset",
                "auth_version": 0,
            },
            {"sub": "999999", "type": TOKEN_TYPE, "auth_version": 0},
            {
                "sub": str(self.student_user_id),
                "type": TOKEN_TYPE,
                "auth_version": 99,
            },
        )
        for payload in payloads:
            payload = {**payload, "exp": now + timedelta(hours=1)}
            token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
            with self.subTest(payload=payload):
                self.assert_unauthorized_token(token)

    def test_role_dependencies_reject_cross_role_use(self):
        with self.Session() as db:
            student = db.get(User, self.student_user_id)
            admin = db.get(User, self.admin_user_id)
            with self.assertRaises(HTTPException) as student_error:
                require_admin(student)
            with self.assertRaises(HTTPException) as admin_error:
                require_student(admin)
        self.assertEqual(student_error.exception.status_code, 403)
        self.assertEqual(admin_error.exception.status_code, 403)

    def test_wrong_login_field_types_are_rejected_at_schema_boundary(self):
        with self.assertRaises(ValidationError):
            LoginRequest(identifier=[], password={}, role=1)

    def test_bad_drive_ids_and_public_upload_path_fail_cleanly(self):
        with self.Session() as db:
            student = db.get(User, self.student_user_id)
            for drive_id in (-1, 0, 999999999999):
                with self.subTest(drive_id=drive_id):
                    with self.assertRaises(HTTPException) as error:
                        drives.get_drive(drive_id, student, db)
                    self.assertEqual(error.exception.status_code, 404)
        public_mounts = [
            route
            for route in app.routes
            if isinstance(route, Mount) and route.path == "/uploads"
        ]
        self.assertEqual(public_mounts, [])


class RegistrationSchemaBoundaryTests(unittest.TestCase):
    def valid_payload(self):
        return {
            "name": "QA Student",
            "roll_no": "QA_REG_001",
            "password": "long-enough-password",
            "mobile": "+91 98765-43210",
            "branch": "CSE",
            "graduation_year": 2027,
            "cgpa": 10,
            "tenth_percentage": 100,
            "twelfth_percentage": 0,
            "active_backlogs": 0,
            "history_of_backlogs": False,
            "gender": "Any",
            "specially_abled": False,
        }

    def test_registration_boundaries_and_mobile_normalization_are_accepted(self):
        request = RegistrationCompleteRequest(**self.valid_payload())
        self.assertEqual(request.mobile, "9876543210")
        self.assertEqual(request.cgpa, 10)
        self.assertEqual(request.tenth_percentage, 100)

    def test_role_injection_is_forbidden(self):
        with self.assertRaises(ValidationError):
            RegistrationCompleteRequest(**self.valid_payload(), role="admin")

    def test_invalid_mobile_and_academic_ranges_are_rejected(self):
        cases = (
            {"mobile": "1234567890"},
            {"cgpa": 10.01},
            {"tenth_percentage": -0.01},
            {"twelfth_percentage": 100.01},
            {"active_backlogs": -1},
            {"graduation_year": 1899},
        )
        for change in cases:
            with self.subTest(change=change):
                payload = {**self.valid_payload(), **change}
                with self.assertRaises(ValidationError):
                    RegistrationCompleteRequest(**payload)


class EligibilityMatrixTests(unittest.TestCase):
    def student(self, **changes):
        values = {
            "cgpa": 8.0,
            "tenth_percentage": 80.0,
            "twelfth_percentage": 80.0,
            "active_backlogs": 0,
            "branch": "CSE",
            "graduation_year": 2027,
            "gender": "Female",
            "specially_abled": False,
        }
        values.update(changes)
        return SimpleNamespace(**values)

    def drive(self, **changes):
        values = {
            "min_cgpa": 8.0,
            "min_tenth": 80.0,
            "min_twelfth": 80.0,
            "max_backlogs": 0,
            "branches": "CSE, ECE",
            "graduation_year": 2027,
            "gender": "Female",
            "pwd_eligibility": "Any",
        }
        values.update(changes)
        return SimpleNamespace(**values)

    def test_exact_boundaries_and_no_restrictions_are_eligible(self):
        self.assertEqual(check_eligibility(self.student(), self.drive()), (True, None))
        unrestricted = self.drive(
            min_cgpa=0,
            min_tenth=0,
            min_twelfth=0,
            max_backlogs=99,
            branches=None,
            graduation_year=None,
            gender="Any",
            pwd_eligibility="Any",
        )
        self.assertEqual(check_eligibility(self.student(), unrestricted), (True, None))

    def test_each_supported_criterion_rejects_just_below_or_outside_boundary(self):
        cases = (
            (self.student(cgpa=7.99), self.drive(), "Minimum CGPA"),
            (self.student(tenth_percentage=79.99), self.drive(), "Minimum 10th"),
            (self.student(twelfth_percentage=79.99), self.drive(), "Minimum 12th"),
            (self.student(active_backlogs=1), self.drive(), "Maximum backlogs"),
            (self.student(branch="ME"), self.drive(), "branch"),
            (self.student(graduation_year=2028), self.drive(), "Graduation year"),
            (self.student(gender="Male"), self.drive(), "Gender"),
        )
        for student, drive, message in cases:
            with self.subTest(message=message):
                eligible, reason = check_eligibility(student, drive)
                self.assertFalse(eligible)
                self.assertIn(message.lower(), reason.lower())

    def test_branch_and_gender_matching_are_case_insensitive(self):
        student = self.student(branch="cse", gender="female")
        self.assertEqual(check_eligibility(student, self.drive()), (True, None))

    def test_pwd_only_non_pwd_only_and_missing_status(self):
        cases = (
            (True, "PwD Only", True),
            (False, "PwD Only", False),
            (False, "Non-PwD Only", True),
            (True, "Non-PwD Only", False),
            (None, "PwD Only", False),
        )
        for status, restriction, expected in cases:
            with self.subTest(status=status, restriction=restriction):
                eligible, _ = check_eligibility(
                    self.student(specially_abled=status),
                    self.drive(pwd_eligibility=restriction),
                )
                self.assertEqual(eligible, expected)

    def assert_missing_required_value(self, field, reason_text):
        eligible, reason = check_eligibility(
            self.student(**{field: None}),
            self.drive(),
        )
        self.assertFalse(eligible)
        self.assertIn(reason_text, reason)

    def test_null_cgpa_is_ineligible_when_cgpa_is_required(self):
        self.assert_missing_required_value("cgpa", "CGPA information")

    def test_null_tenth_marks_are_ineligible_when_marks_are_required(self):
        self.assert_missing_required_value(
            "tenth_percentage",
            "10th percentage information",
        )

    def test_null_twelfth_marks_are_ineligible_when_marks_are_required(self):
        self.assert_missing_required_value(
            "twelfth_percentage",
            "12th percentage information",
        )

    def test_null_backlogs_are_ineligible_when_backlogs_are_constrained(self):
        self.assert_missing_required_value(
            "active_backlogs",
            "Backlog information",
        )

    def test_null_branch_is_ineligible_when_branches_are_constrained(self):
        self.assert_missing_required_value("branch", "Branch information")

    def test_null_graduation_year_is_ineligible_when_year_is_constrained(self):
        self.assert_missing_required_value(
            "graduation_year",
            "Graduation year information",
        )

    def test_null_gender_is_ineligible_when_gender_is_constrained(self):
        self.assert_missing_required_value("gender", "Gender information")

    def test_null_values_are_allowed_when_criteria_are_unrestricted(self):
        student = self.student(
            cgpa=None,
            tenth_percentage=None,
            twelfth_percentage=None,
            active_backlogs=None,
            branch=None,
            graduation_year=None,
            gender=None,
            specially_abled=None,
        )
        drive = self.drive(
            min_cgpa=0,
            min_tenth=0,
            min_twelfth=0,
            max_backlogs=None,
            branches=None,
            graduation_year=None,
            gender="Any",
            pwd_eligibility="Any",
        )
        self.assertEqual(check_eligibility(student, drive), (True, None))


class StateMachineExtendedTests(unittest.TestCase):
    def test_rejection_is_terminal_from_every_valid_active_round(self):
        sources = (
            ("Applied", "Applied", False, "PPT"),
            ("Applied", "Resume Shortlisting", True, "Resume Shortlisting"),
            ("Shortlisted", "PPT", True, "PPT"),
            ("Shortlisted", "Online Test", True, "Online Test"),
            ("Shortlisted", "Interview", True, "Interview"),
            ("Shortlisted", "Result", True, "Result"),
        )
        for status, stage, resume, rejection_stage in sources:
            with self.subTest(stage=stage):
                application = SimpleNamespace(status=status, current_stage=stage)
                transition_application(
                    application,
                    resume,
                    "Rejected",
                    rejection_stage,
                )
                self.assertEqual(application.status, "Rejected")
                with self.assertRaises(ApplicationTransitionError):
                    transition_application(
                        application,
                        resume,
                        "Shortlisted",
                        "PPT",
                    )

    def test_inconsistent_and_resume_only_states_are_rejected(self):
        cases = (
            ("Applied", "Interview", True, "Shortlisted", "Result"),
            ("Shortlisted", "Resume Shortlisting", True, "Shortlisted", "PPT"),
            ("Applied", "Applied", False, "Applied", "Resume Shortlisting"),
        )
        for source_status, source_stage, resume, target_status, target_stage in cases:
            with self.subTest(source=(source_status, source_stage)):
                application = SimpleNamespace(
                    status=source_status,
                    current_stage=source_stage,
                )
                with self.assertRaises(ApplicationTransitionError):
                    transition_application(
                        application,
                        resume,
                        target_status,
                        target_stage,
                    )


class UploadPrimitiveBoundaryTests(unittest.TestCase):
    def test_valid_doc_and_docx_signatures_are_accepted(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            doc = root / "resume.doc"
            doc.write_bytes(bytes.fromhex("D0CF11E0A1B11AE1") + b"payload")
            validate_resume_content(doc, ".doc")

            docx = root / "resume.docx"
            with zipfile.ZipFile(docx, "w") as archive:
                archive.writestr("[Content_Types].xml", "content")
                archive.writestr("word/document.xml", "document")
            validate_resume_content(docx, ".docx")

    def test_exact_upload_limit_is_accepted_and_one_byte_over_is_rejected(self):
        exact = make_upload("results.xlsx", b"x" * MAX_EXCEL_SIZE, XLSX_MIME)
        contents = asyncio.run(read_upload_with_limit(exact, MAX_EXCEL_SIZE))
        self.assertEqual(len(contents), MAX_EXCEL_SIZE)

        oversized = make_upload("resume.pdf", b"x" * (MAX_RESUME_SIZE + 1), "application/pdf")
        with self.assertRaises(HTTPException) as error:
            asyncio.run(read_upload_with_limit(oversized, MAX_RESUME_SIZE))
        self.assertEqual(error.exception.status_code, 413)


class ExcelRoundExtendedTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.Session = sessionmaker(bind=self.engine)
        Base.metadata.create_all(self.engine)
        self.db = self.Session()
        self.students = [
            Student(
                name=f"QA Excel {index}",
                email=f"qa.excel{index}@nitrkl.ac.in",
                roll_no=f"QA_XLS_{index:03d}",
                branch="CSE",
                graduation_year=2027,
                cgpa=8,
                tenth_percentage=80,
                twelfth_percentage=80,
            )
            for index in (1, 2)
        ]
        self.drive = PlacementDrive(
            company_name="QA Excel Drive",
            role="Engineer",
            status="Published",
            resume_shortlisting=False,
        )
        self.admin = User(
            username="qa.excel.admin",
            password_hash="unused",
            role="admin",
        )
        self.db.add_all([*self.students, self.drive, self.admin])
        self.db.flush()
        self.applications = [
            Application(
                student_id=student.id,
                drive_id=self.drive.id,
                status="Applied",
                current_stage="Applied",
            )
            for student in self.students
        ]
        self.db.add_all(self.applications)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def upload(self, header, values, filename="results.xlsx", content_type=XLSX_MIME, stage="PPT"):
        return asyncio.run(
            drives.upload_round_results(
                self.drive.id,
                stage=stage,
                file=make_upload(
                    filename,
                    workbook_bytes(header, values),
                    content_type,
                ),
                current_user=self.admin,
                db=self.db,
            )
        )

    def test_alternate_header_case_whitespace_and_duplicate_rolls(self):
        result = self.upload(
            "  ROLL-NUMBER  ",
            [" qa_xls_001 ", "QA_XLS_001", None, ""],
        )
        self.assertEqual(result["passed_count"], 1)
        self.assertEqual(result["failed_count"], 1)

    def test_valid_xlsm_extension_and_mime_are_accepted(self):
        result = self.upload(
            "Roll No.",
            ["QA_XLS_001"],
            filename="results.xlsm",
            content_type=XLSM_MIME,
        )
        self.assertEqual(result["total_processed"], 2)

    def test_unknown_roll_means_zero_passers_and_rejects_current_candidates(self):
        result = self.upload("roll", ["QA_UNKNOWN"])
        self.assertEqual(result["passed_count"], 0)
        self.assertEqual(result["failed_count"], 2)

    def test_header_only_and_wrong_round_leave_applications_unchanged(self):
        before = [
            (application.status, application.current_stage)
            for application in self.applications
        ]
        for header, values, stage in (
            ("Roll No.", [], "PPT"),
            ("Roll No.", ["QA_XLS_001"], "Interview"),
        ):
            with self.subTest(stage=stage, values=values):
                with self.assertRaises(HTTPException):
                    self.upload(header, values, stage=stage)
                self.db.expire_all()
                after = [
                    (self.db.get(Application, application.id).status,
                     self.db.get(Application, application.id).current_stage)
                    for application in self.applications
                ]
                self.assertEqual(after, before)


if __name__ == "__main__":
    unittest.main()
