import asyncio
import io
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

from fastapi import HTTPException
from fastapi import UploadFile
from openpyxl import Workbook
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.datastructures import Headers
from starlette.responses import FileResponse
from starlette.routing import Mount

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import Base  # noqa: E402
from main import app as main_app  # noqa: E402
from models import Application  # noqa: E402
from models import PlacementDrive  # noqa: E402
from models import Student  # noqa: E402
from models import User  # noqa: E402
from routers import drives  # noqa: E402
from routers import students  # noqa: E402
from routers.auth import get_current_user  # noqa: E402
from routers.auth import require_admin  # noqa: E402
from upload_security import MAX_EXCEL_SIZE  # noqa: E402
from upload_security import MAX_JD_SIZE  # noqa: E402
from upload_security import MAX_RESUME_SIZE  # noqa: E402


PDF_BYTES = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n"
PDF_MIME = "application/pdf"
XLSX_MIME = (
    "application/vnd.openxmlformats-officedocument."
    "spreadsheetml.sheet"
)


def make_upload(filename, contents, content_type):
    return UploadFile(
        file=io.BytesIO(contents),
        filename=filename,
        headers=Headers({
            "content-type": content_type,
        }),
    )


def workbook_bytes(roll_numbers):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.append(["Roll No."])

    for roll_number in roll_numbers:
        worksheet.append([roll_number])

    stream = io.BytesIO()
    workbook.save(stream)
    workbook.close()
    return stream.getvalue()


def malformed_office_zip():
    stream = io.BytesIO()

    with zipfile.ZipFile(stream, "w") as archive:
        archive.writestr(
            "[Content_Types].xml",
            "not xml",
        )
        archive.writestr(
            "xl/workbook.xml",
            "not a workbook",
        )

    return stream.getvalue()


class UploadSecurityTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = (
            tempfile.TemporaryDirectory()
        )
        root = Path(
            self.temporary_directory.name
        )
        self.resume_directory = root / "resumes"
        self.jd_directory = root / "jd"
        self.resume_directory.mkdir()
        self.jd_directory.mkdir()

        self.original_resume_directory = (
            students.RESUME_DIRECTORY
        )
        self.original_jd_directory = (
            drives.UPLOAD_DIR
        )
        students.RESUME_DIRECTORY = str(
            self.resume_directory
        )
        drives.UPLOAD_DIR = str(
            self.jd_directory
        )

        self.engine = create_engine(
            "sqlite://",
            connect_args={
                "check_same_thread": False,
            },
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.session_factory = sessionmaker(
            bind=self.engine
        )
        self.db = self.session_factory()

        self.owner = Student(
            name="Upload Owner",
            email="owner@example.com",
            roll_no="UPLOAD001",
            branch="CSE",
            graduation_year=2027,
            cgpa=8.0,
            tenth_percentage=80.0,
            twelfth_percentage=80.0,
        )
        self.other_student = Student(
            name="Other Student",
            email="other@example.com",
            roll_no="UPLOAD002",
            branch="ECE",
            graduation_year=2027,
            cgpa=8.0,
            tenth_percentage=80.0,
            twelfth_percentage=80.0,
        )
        self.drive = PlacementDrive(
            company_name="Upload Company",
            role="Engineer",
            status="Published",
            resume_shortlisting=False,
        )
        self.draft_drive = PlacementDrive(
            company_name="Draft Upload Company",
            role="Engineer",
            status="Draft",
            resume_shortlisting=False,
        )
        self.withdrawn_drive = PlacementDrive(
            company_name="Withdrawn Upload Company",
            role="Engineer",
            status="Withdrawn",
            resume_shortlisting=False,
        )
        self.db.add_all([
            self.owner,
            self.other_student,
            self.drive,
            self.draft_drive,
            self.withdrawn_drive,
        ])
        self.db.flush()

        self.admin = User(
            username="upload-admin",
            password_hash="not-used",
            role="admin",
        )
        self.owner_user = User(
            username="upload-owner",
            password_hash="not-used",
            role="student",
            student_id=self.owner.id,
        )
        self.other_user = User(
            username="upload-other",
            password_hash="not-used",
            role="student",
            student_id=self.other_student.id,
        )
        self.application = Application(
            student_id=self.owner.id,
            drive_id=self.drive.id,
            status="Applied",
            current_stage="Applied",
        )
        self.db.add_all([
            self.admin,
            self.owner_user,
            self.other_user,
            self.application,
        ])
        self.db.commit()

        self.owner_id = self.owner.id
        self.other_id = self.other_student.id
        self.drive_id = self.drive.id
        self.draft_drive_id = (
            self.draft_drive.id
        )
        self.withdrawn_drive_id = (
            self.withdrawn_drive.id
        )

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()
        students.RESUME_DIRECTORY = (
            self.original_resume_directory
        )
        drives.UPLOAD_DIR = (
            self.original_jd_directory
        )
        self.temporary_directory.cleanup()

    def upload_resume(
        self,
        filename="resume.pdf",
        contents=PDF_BYTES,
        content_type=PDF_MIME,
        student_id=None,
    ):
        return asyncio.run(
            students.upload_resume(
                student_id or self.owner_id,
                make_upload(
                    filename,
                    contents,
                    content_type,
                ),
                self.owner_user,
                self.db,
            )
        )

    def upload_jd(
        self,
        filename="jd.pdf",
        contents=PDF_BYTES,
        content_type=PDF_MIME,
    ):
        return asyncio.run(
            drives.upload_job_description(
                self.drive_id,
                make_upload(
                    filename,
                    contents,
                    content_type,
                ),
                self.admin,
                self.db,
            )
        )

    def upload_excel(
        self,
        contents=None,
        content_type=XLSX_MIME,
    ):
        return asyncio.run(
            drives.upload_round_results(
                self.drive_id,
                stage="PPT",
                file=make_upload(
                    "results.xlsx",
                    contents
                    if contents is not None
                    else workbook_bytes([
                        "UPLOAD001"
                    ]),
                    content_type,
                ),
                current_user=self.admin,
                db=self.db,
            )
        )

    def assert_http_status(self, status_code, action):
        with self.assertRaises(HTTPException) as context:
            action()

        self.assertEqual(
            context.exception.status_code,
            status_code,
        )

    def attach_jd(self, drive):
        filename = f"drive-{drive.id}.pdf"
        path = self.jd_directory / filename
        path.write_bytes(PDF_BYTES)
        drive.jd = f"/uploads/jd/{filename}"
        drive.jd_filename = "jd.pdf"
        self.db.commit()
        return path

    def test_owner_student_valid_pdf_resume_succeeds(self):
        result = self.upload_resume()
        self.assertEqual(result.id, self.owner_id)
        self.assertEqual(
            len(list(self.resume_directory.iterdir())),
            1,
        )

    def test_student_cannot_upload_another_resume(self):
        self.assert_http_status(
            403,
            lambda: self.upload_resume(
                student_id=self.other_id
            ),
        )

    def test_unauthenticated_resume_upload_is_rejected(self):
        self.assert_http_status(
            401,
            lambda: get_current_user(
                credentials=None,
                db=self.db,
            ),
        )

    def test_resume_invalid_extension_is_rejected(self):
        self.assert_http_status(
            400,
            lambda: self.upload_resume(
                "resume.txt",
                PDF_BYTES,
                "text/plain",
            ),
        )

    def test_resume_invalid_content_is_rejected(self):
        self.assert_http_status(
            400,
            lambda: self.upload_resume(
                contents=b"not pdf"
            ),
        )

    def test_resume_mime_mismatch_is_rejected(self):
        self.assert_http_status(
            400,
            lambda: self.upload_resume(
                content_type="text/plain"
            ),
        )

    def test_oversized_resume_returns_413(self):
        self.assert_http_status(
            413,
            lambda: self.upload_resume(
                contents=(
                    PDF_BYTES
                    + b"0" * MAX_RESUME_SIZE
                )
            ),
        )

    def test_resume_partial_file_removed_on_size_failure(self):
        self.test_oversized_resume_returns_413()
        self.assertEqual(
            list(self.resume_directory.iterdir()),
            [],
        )

    def test_resume_path_traversal_filename_is_confined(self):
        self.upload_resume("../../outside.pdf")
        stored_files = list(
            self.resume_directory.iterdir()
        )
        self.assertEqual(len(stored_files), 1)
        self.assertEqual(
            stored_files[0].parent,
            self.resume_directory,
        )

    def test_admin_valid_pdf_jd_succeeds(self):
        result = self.upload_jd()
        self.assertEqual(result.id, self.drive_id)

    def test_student_jd_upload_is_rejected(self):
        self.assert_http_status(
            403,
            lambda: require_admin(
                self.owner_user
            ),
        )

    def test_unauthenticated_jd_upload_is_rejected(self):
        self.assert_http_status(
            401,
            lambda: get_current_user(
                credentials=None,
                db=self.db,
            ),
        )

    def test_fake_pdf_jd_is_rejected(self):
        self.assert_http_status(
            400,
            lambda: self.upload_jd(
                contents=b"not pdf"
            ),
        )

    def test_oversized_jd_returns_413(self):
        self.assert_http_status(
            413,
            lambda: self.upload_jd(
                contents=(
                    PDF_BYTES
                    + b"0" * MAX_JD_SIZE
                )
            ),
        )

    def test_jd_partial_file_removed_on_failure(self):
        self.test_oversized_jd_returns_413()
        self.assertEqual(
            list(self.jd_directory.iterdir()),
            [],
        )

    def test_admin_valid_xlsx_succeeds(self):
        result = self.upload_excel()
        self.assertEqual(result["passed_count"], 1)

    def test_student_excel_upload_is_rejected(self):
        self.assert_http_status(
            403,
            lambda: require_admin(
                self.owner_user
            ),
        )

    def test_unauthenticated_excel_upload_is_rejected(self):
        self.assert_http_status(
            401,
            lambda: get_current_user(
                credentials=None,
                db=self.db,
            ),
        )

    def test_csv_disguised_as_xlsx_is_rejected(self):
        self.assert_http_status(
            400,
            lambda: self.upload_excel(
                b"Roll No.\nUPLOAD001"
            ),
        )

    def test_malformed_office_zip_is_rejected(self):
        with self.assertLogs(
            drives.logger,
            level="ERROR",
        ):
            self.assert_http_status(
                400,
                lambda: self.upload_excel(
                    malformed_office_zip()
                ),
            )

    def test_oversized_excel_returns_413(self):
        self.assert_http_status(
            413,
            lambda: self.upload_excel(
                b"PK\x03\x04"
                + b"0" * MAX_EXCEL_SIZE
            ),
        )

    def test_excel_mime_mismatch_is_rejected(self):
        self.assert_http_status(
            400,
            lambda: self.upload_excel(
                content_type="text/csv"
            ),
        )

    def test_resume_owner_can_download(self):
        self.upload_resume()
        response = students.download_resume(
            self.owner_id,
            self.owner_user,
            self.db,
        )
        self.assertIsInstance(
            response,
            FileResponse,
        )

    def test_resume_other_student_is_blocked(self):
        self.upload_resume()
        self.assert_http_status(
            403,
            lambda: students.download_resume(
                self.owner_id,
                self.other_user,
                self.db,
            ),
        )

    def test_resume_admin_can_download(self):
        self.upload_resume()
        response = students.download_resume(
            self.owner_id,
            self.admin,
            self.db,
        )
        self.assertIsInstance(
            response,
            FileResponse,
        )

    def test_resume_download_requires_authentication(self):
        self.assert_http_status(
            401,
            lambda: get_current_user(
                credentials=None,
                db=self.db,
            ),
        )

    def test_missing_resume_returns_404(self):
        self.assert_http_status(
            404,
            lambda: students.download_resume(
                self.owner_id,
                self.owner_user,
                self.db,
            ),
        )

    def test_manipulated_resume_path_is_rejected(self):
        outside_file = (
            self.resume_directory.parent
            / "outside.pdf"
        )
        outside_file.write_bytes(PDF_BYTES)
        self.owner.resume_url = str(
            outside_file
        )
        self.db.commit()

        self.assert_http_status(
            404,
            lambda: students.download_resume(
                self.owner_id,
                self.owner_user,
                self.db,
            ),
        )

    def test_admin_can_download_published_jd(self):
        self.attach_jd(self.drive)
        response = drives.download_job_description(
            self.drive_id,
            self.admin,
            self.db,
        )
        self.assertIsInstance(
            response,
            FileResponse,
        )

    def test_admin_can_download_draft_jd(self):
        self.attach_jd(self.draft_drive)
        response = drives.download_job_description(
            self.draft_drive_id,
            self.admin,
            self.db,
        )
        self.assertIsInstance(
            response,
            FileResponse,
        )

    def test_student_can_download_published_jd(self):
        self.attach_jd(self.drive)
        response = drives.download_job_description(
            self.drive_id,
            self.owner_user,
            self.db,
        )
        self.assertIsInstance(
            response,
            FileResponse,
        )

    def test_student_cannot_download_draft_jd(self):
        self.attach_jd(self.draft_drive)
        self.assert_http_status(
            404,
            lambda: drives.download_job_description(
                self.draft_drive_id,
                self.owner_user,
                self.db,
            ),
        )

    def test_student_cannot_download_withdrawn_jd(self):
        self.attach_jd(self.withdrawn_drive)
        self.assert_http_status(
            404,
            lambda: drives.download_job_description(
                self.withdrawn_drive_id,
                self.owner_user,
                self.db,
            ),
        )

    def test_jd_download_requires_authentication(self):
        self.assert_http_status(
            401,
            lambda: get_current_user(
                credentials=None,
                db=self.db,
            ),
        )

    def test_missing_jd_returns_404(self):
        self.assert_http_status(
            404,
            lambda: drives.download_job_description(
                self.drive_id,
                self.admin,
                self.db,
            ),
        )

    def test_manipulated_jd_path_is_rejected(self):
        outside_file = (
            self.jd_directory.parent
            / "outside.pdf"
        )
        outside_file.write_bytes(PDF_BYTES)
        self.drive.jd = str(outside_file)
        self.db.commit()

        self.assert_http_status(
            404,
            lambda: drives.download_job_description(
                self.drive_id,
                self.admin,
                self.db,
            ),
        )

    def test_public_upload_mount_is_removed(self):
        public_upload_mounts = [
            route
            for route in main_app.routes
            if (
                isinstance(route, Mount)
                and route.path == "/uploads"
            )
        ]
        self.assertEqual(
            public_upload_mounts,
            [],
        )


if __name__ == "__main__":
    unittest.main()
