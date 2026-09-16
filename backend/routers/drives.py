import logging
import os
import uuid
from io import BytesIO

from openpyxl import load_workbook

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import Form
from fastapi import HTTPException
from fastapi import UploadFile

from sqlalchemy.orm import Session

from application_state import ROUND_STAGES
from application_state import advance_application_for_round
from application_state import is_application_ready_for_round
from application_state import next_stage_after_round
from application_state import normalize_stage
from application_state import reject_application_for_round
from database import get_db

from models import Application
from models import PlacementDrive
from models import Student
from models import User

from schemas import DriveCreate
from schemas import DriveResponse
from schemas import DriveUpdate

from routers.auth import get_current_user
from routers.auth import require_admin


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/drives",
    tags=["Placement Drives"],
)


UPLOAD_DIR = "uploads/jd"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


def normalize_roll_no(value):
    if value is None:
        return ""

    return (
        str(value)
        .strip()
        .lower()
        .replace(" ", "")
        .replace("\u00a0", "")
    )


@router.get(
    "/",
    response_model=list[DriveResponse],
)
def get_drives(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    user_role = current_user.role.lower()

    if user_role == "admin":
        query = db.query(PlacementDrive)
    elif user_role == "student":
        query = db.query(PlacementDrive).filter(
            PlacementDrive.status == "Published"
        )
    else:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view placement drives",
        )

    return (
        query
        .order_by(
            PlacementDrive.id.desc()
        )
        .all()
    )


@router.get(
    "/{drive_id}",
    response_model=DriveResponse,
)
def get_drive(
    drive_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
):
    drive = (
        db.query(
            PlacementDrive
        )
        .filter(
            PlacementDrive.id
            == drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail=(
                "Placement drive not found"
            ),
        )

    if (
        current_user.role.lower() == "student"
        and drive.status != "Published"
    ):
        raise HTTPException(
            status_code=404,
            detail="Placement drive not found",
        )

    if current_user.role.lower() != "admin" and current_user.role.lower() != "student":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view placement drives",
        )

    return drive


@router.post(
    "/",
    response_model=DriveResponse,
)
def create_drive(
    drive_data: DriveCreate,
    current_user: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
):
    try:
        drive = PlacementDrive(
            **drive_data.model_dump()
        )

        db.add(drive)

        db.commit()

        db.refresh(drive)

        return drive

    except Exception as error:
        db.rollback()

        logger.exception(
            "Unexpected error while creating placement drive"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to create placement drive.",
        ) from error


@router.patch(
    "/{drive_id}",
    response_model=DriveResponse,
)
def update_drive(
    drive_id: int,
    drive_data: DriveUpdate,
    current_user: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
):
    drive = (
        db.query(
            PlacementDrive
        )
        .filter(
            PlacementDrive.id
            == drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail=(
                "Placement drive not found"
            ),
        )

    update_data = (
        drive_data.model_dump(
            exclude_unset=True
        )
    )

    try:
        for field, value in (
            update_data.items()
        ):
            setattr(
                drive,
                field,
                value,
            )

        db.commit()

        db.refresh(drive)

        return drive

    except Exception as error:
        db.rollback()

        logger.exception(
            "Unexpected error while updating placement drive"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to update placement drive.",
        ) from error


@router.post(
    "/{drive_id}/jd",
    response_model=DriveResponse,
)
async def upload_job_description(
    drive_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
):
    drive = (
        db.query(
            PlacementDrive
        )
        .filter(
            PlacementDrive.id
            == drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail=(
                "Placement drive not found"
            ),
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected",
        )

    original_filename = file.filename

    extension = os.path.splitext(
        original_filename
    )[1].lower()

    if extension != ".pdf":
        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF files are allowed"
            ),
        )

    unique_name = (
        f"{uuid.uuid4().hex}.pdf"
    )

    file_path = os.path.join(
        UPLOAD_DIR,
        unique_name,
    )

    old_jd_path = None

    if drive.jd:
        old_jd_path = (
            drive.jd
            .lstrip("/")
            .replace(
                "/",
                os.sep,
            )
        )

    try:
        with open(
            file_path,
            "wb",
        ) as buffer:

            while True:
                chunk = await file.read(
                    1024 * 1024
                )

                if not chunk:
                    break

                buffer.write(chunk)

        drive.jd = (
            f"/uploads/jd/{unique_name}"
        )

        drive.jd_filename = (
            original_filename
        )

        db.commit()

        db.refresh(drive)

        if (
            old_jd_path
            and os.path.exists(
                old_jd_path
            )
            and old_jd_path != file_path
        ):
            try:
                os.remove(
                    old_jd_path
                )
            except OSError:
                pass

        return drive

    except Exception as error:
        db.rollback()

        logger.exception(
            "Unexpected error while uploading job description"
        )

        if os.path.exists(
            file_path
        ):
            try:
                os.remove(
                    file_path
                )
            except OSError:
                pass

        raise HTTPException(
            status_code=500,
            detail="Failed to upload job description.",
        ) from error

    finally:
        await file.close()


@router.post(
    "/{drive_id}/round-results",
)
async def upload_round_results(
    drive_id: int,
    stage: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(
        require_admin
    ),
    db: Session = Depends(
        get_db
    ),
):
    drive = (
        db.query(
            PlacementDrive
        )
        .filter(
            PlacementDrive.id
            == drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail=(
                "Placement drive not found"
            ),
        )

    stage = normalize_stage(stage)

    allowed_stages = list(ROUND_STAGES)

    if stage not in allowed_stages:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid recruitment round. "
                "Allowed rounds are: "
                + ", ".join(
                    allowed_stages
                )
            ),
        )

    if (
        stage == "Resume Shortlisting"
        and not drive.resume_shortlisting
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Resume shortlisting is "
                "not enabled for this "
                "placement drive"
            ),
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected",
        )

    extension = os.path.splitext(
        file.filename
    )[1].lower()

    if extension not in {
        ".xlsx",
        ".xlsm",
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "Only .xlsx and .xlsm "
                "Excel files are allowed"
            ),
        )

    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail=(
                    "The uploaded Excel "
                    "file is empty"
                ),
            )

        workbook = load_workbook(
            filename=BytesIO(contents),
            read_only=True,
            data_only=True,
        )

        worksheet = workbook.active

        rows = list(
            worksheet.iter_rows(
                values_only=True
            )
        )

        workbook.close()

    except HTTPException:
        raise

    except Exception as error:
        logger.exception(
            "Unable to parse uploaded round-results file"
        )

        raise HTTPException(
            status_code=400,
            detail="Unable to read the uploaded Excel file.",
        ) from error

    if not rows:
        raise HTTPException(
            status_code=400,
            detail=(
                "The Excel file "
                "contains no data"
            ),
        )

    headers = []

    for value in rows[0]:
        if value is None:
            headers.append("")
        else:
            headers.append(
                str(value)
                .strip()
                .lower()
            )

    roll_no_index = None

    for index, header in enumerate(
        headers
    ):
        normalized_header = (
            header
            .replace("_", " ")
            .replace("-", " ")
            .replace(".", "")
            .strip()
        )

        normalized_header = (
            " ".join(
                normalized_header.split()
            )
        )

        if normalized_header in {
            "roll no",
            "roll number",
            "rollno",
            "roll",
        }:
            roll_no_index = index
            break

    if roll_no_index is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Excel file must contain "
                "a Roll No. column"
            ),
        )

    excel_roll_numbers = set()

    for row in rows[1:]:

        if (
            roll_no_index
            >= len(row)
        ):
            continue

        value = row[
            roll_no_index
        ]

        if value is None:
            continue

        roll_no = normalize_roll_no(
            value
        )

        if roll_no:
            excel_roll_numbers.add(
                roll_no
            )

    if not excel_roll_numbers:
        raise HTTPException(
            status_code=400,
            detail=(
                "No student roll numbers "
                "were found in the Excel file"
            ),
        )

    next_stage = next_stage_after_round(
        stage
    )

    applications = (
        db.query(
            Application,
            Student,
        )
        .join(
            Student,
            Student.id
            == Application.student_id,
        )
        .filter(
            Application.drive_id
            == drive_id,
        )
        .all()
    )

    current_stage_applications = []

    for (
        application,
        student,
    ) in applications:

        if not is_application_ready_for_round(
            application,
            drive.resume_shortlisting,
            stage,
        ):
            continue

        current_stage_applications.append(
            (
                application,
                student,
            )
        )

    if not current_stage_applications:

        available_stages = sorted(
            {
                normalize_stage(
                    application.current_stage
                )
                for (
                    application,
                    student,
                ) in applications
                if (
                    application.status
                    not in {
                        "Rejected",
                        "Selected",
                    }
                )
            }
        )

        if available_stages:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"No applications are "
                    f"currently ready for "
                    f"the '{stage}' round. "
                    f"Current application "
                    f"stages are: "
                    f"{', '.join(available_stages)}"
                ),
            )

        raise HTTPException(
            status_code=400,
            detail=(
                "No applications exist "
                "for this placement drive"
            ),
        )

    passed_count = 0
    failed_count = 0

    processed_students = []

    for (
        application,
        student,
    ) in current_stage_applications:

        student_roll_no = (
            normalize_roll_no(
                student.roll_no
            )
        )

        if (
            student_roll_no
            in excel_roll_numbers
        ):

            passed_count += 1

            advance_application_for_round(
                application,
                drive.resume_shortlisting,
                stage,
            )

            processed_students.append(
                {
                    "roll_no":
                        student.roll_no,
                    "result":
                        "passed",
                }
            )

        else:

            failed_count += 1

            reject_application_for_round(
                application,
                drive.resume_shortlisting,
                stage,
            )

            processed_students.append(
                {
                    "roll_no":
                        student.roll_no,
                    "result":
                        "rejected",
                }
            )

    try:

        db.commit()

    except Exception as error:

        db.rollback()

        logger.exception(
            "Unexpected error while processing round results"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to process round results.",
        ) from error

    return {
        "message": (
            "Round results processed "
            "successfully"
        ),
        "drive_id":
            drive_id,
        "stage":
            stage,
        "next_stage":
            next_stage,
        "passed_count":
            passed_count,
        "failed_count":
            failed_count,
        "total_processed":
            (
                passed_count
                + failed_count
            ),
        "uploaded_filename":
            file.filename,
        "processed_students":
            processed_students,
    }
