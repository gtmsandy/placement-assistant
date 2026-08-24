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
    )


@router.get(
    "/",
    response_model=list[DriveResponse],
)
def get_drives(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(PlacementDrive)
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    drive = (
        db.query(PlacementDrive)
        .filter(
            PlacementDrive.id == drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail="Placement drive not found",
        )

    return drive


@router.post(
    "/",
    response_model=DriveResponse,
)
def create_drive(
    drive_data: DriveCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
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

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to create placement drive: "
                f"{str(error)}"
            ),
        )


@router.patch(
    "/{drive_id}",
    response_model=DriveResponse,
)
def update_drive(
    drive_id: int,
    drive_data: DriveUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    drive = (
        db.query(PlacementDrive)
        .filter(
            PlacementDrive.id == drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail="Placement drive not found",
        )

    update_data = drive_data.model_dump(
        exclude_unset=True
    )

    try:
        for field, value in update_data.items():
            setattr(
                drive,
                field,
                value
            )

        db.commit()
        db.refresh(drive)

        return drive

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to update placement drive: "
                f"{str(error)}"
            ),
        )


@router.post(
    "/{drive_id}/jd",
    response_model=DriveResponse,
)
async def upload_job_description(
    drive_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    drive = (
        db.query(PlacementDrive)
        .filter(
            PlacementDrive.id == drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail="Placement drive not found",
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
            detail="Only PDF files are allowed",
        )

    unique_name = (
        f"{uuid.uuid4().hex}.pdf"
    )

    file_path = os.path.join(
        UPLOAD_DIR,
        unique_name
    )

    old_jd_path = None

    if drive.jd:
        old_jd_path = drive.jd.lstrip(
            "/"
        ).replace(
            "/",
            os.sep
        )

    try:
        with open(
            file_path,
            "wb"
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
            and os.path.exists(old_jd_path)
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

        if os.path.exists(file_path):
            try:
                os.remove(
                    file_path
                )
            except OSError:
                pass

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to upload job description: "
                f"{str(error)}"
            ),
        )


@router.post(
    "/{drive_id}/round-results",
)
async def upload_round_results(
    drive_id: int,
    stage: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    drive = (
        db.query(PlacementDrive)
        .filter(
            PlacementDrive.id == drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail="Placement drive not found",
        )

    allowed_stages = [
        "Resume Shortlisting",
        "PPT",
        "Online Test",
        "Interview",
        "Result",
    ]

    if stage not in allowed_stages:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid stage. Allowed stages are: "
                + ", ".join(allowed_stages)
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

    if extension != ".xlsx":
        raise HTTPException(
            status_code=400,
            detail="Only .xlsx Excel files are allowed",
        )

    try:
        contents = await file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="The uploaded Excel file is empty",
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
        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to read the Excel file: "
                f"{str(error)}"
            ),
        )

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="The Excel file contains no data",
        )

    headers = [
        str(value).strip().lower()
        if value is not None
        else ""
        for value in rows[0]
    ]

    roll_no_index = None

    possible_roll_headers = {
        "roll no.",
        "roll no",
        "roll number",
        "roll_number",
        "rollno",
        "roll_no",
        "roll",
        "roll number.",
    }

    for index, header in enumerate(headers):
        normalized_header = (
            header
            .replace("_", " ")
            .replace("-", " ")
            .replace(".", "")
            .strip()
        )

        if (
            header in possible_roll_headers
            or normalized_header in {
                "roll no",
                "roll number",
                "rollno",
                "roll",
            }
        ):
            roll_no_index = index
            break

    if roll_no_index is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Excel file must contain a Roll No. column"
            ),
        )

    roll_numbers = []

    for row in rows[1:]:

        if (
            roll_no_index >= len(row)
            or row[roll_no_index] is None
        ):
            continue

        roll_no = normalize_roll_no(
            row[roll_no_index]
        )

        if roll_no:
            roll_numbers.append(
                roll_no
            )

    if not roll_numbers:
        raise HTTPException(
            status_code=400,
            detail=(
                "No student roll numbers were found "
                "in the Excel file"
            ),
        )

    students = (
        db.query(Student)
        .all()
    )

    student_by_roll_no = {}

    for student in students:

        normalized_database_roll_no = (
            normalize_roll_no(
                student.roll_no
            )
        )

        if normalized_database_roll_no:
            student_by_roll_no[
                normalized_database_roll_no
            ] = student

    updated_count = 0
    not_found_roll_numbers = []

    for roll_no in roll_numbers:

        student = student_by_roll_no.get(
            roll_no
        )

        if not student:
            not_found_roll_numbers.append(
                roll_no
            )
            continue

        application = (
            db.query(Application)
            .filter(
                Application.student_id
                == student.id,
                Application.drive_id
                == drive_id,
            )
            .first()
        )

        if not application:
            not_found_roll_numbers.append(
                roll_no
            )
            continue

        application.current_stage = stage

        if stage == "Result":
            application.status = "Selected"
        else:
            application.status = "Shortlisted"

        updated_count += 1

    try:
        db.commit()

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to update round results: "
                f"{str(error)}"
            ),
        )

    return {
        "message": "Round results uploaded successfully",
        "drive_id": drive_id,
        "stage": stage,
        "total_students_in_excel": len(
            roll_numbers
        ),
        "updated_applications": updated_count,
        "not_found": not_found_roll_numbers,
    }