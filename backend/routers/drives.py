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
        .replace("\u00a0", "")
    )


def normalize_stage(stage):
    if not stage:
        return ""

    value = (
        str(stage)
        .strip()
        .lower()
        .replace("-", " ")
        .replace("_", " ")
    )

    value = " ".join(
        value.split()
    )

    if value in {
        "resume shortlisting",
        "resumeshortlisting",
    }:
        return "Resume Shortlisting"

    if value == "ppt":
        return "PPT"

    if value in {
        "online test",
        "onlinetest",
    }:
        return "Online Test"

    if value == "interview":
        return "Interview"

    if value == "result":
        return "Result"

    if value == "applied":
        return "Applied"

    return str(stage).strip()


def get_ready_source_stages(
    drive: PlacementDrive,
    stage: str,
):
    """
    Returns the application stages that are considered
    ready for the selected recruitment round.

    This deliberately handles applications created under
    an older configuration of the drive.
    """

    if stage == "Resume Shortlisting":
        return [
            "Applied",
            "Resume Shortlisting",
        ]

    if stage == "PPT":
        if drive.resume_shortlisting:
            return [
                "PPT",
            ]

        return [
            "Applied",
            "Resume Shortlisting",
            "PPT",
        ]

    if stage == "Online Test":
        return [
            "Online Test",
        ]

    if stage == "Interview":
        return [
            "Interview",
        ]

    if stage == "Result":
        return [
            "Result",
        ]

    return []


def get_next_stage(
    stage: str,
):
    if stage == "Resume Shortlisting":
        return "PPT"

    if stage == "PPT":
        return "Online Test"

    if stage == "Online Test":
        return "Interview"

    if stage == "Interview":
        return "Result"

    if stage == "Result":
        return None

    return None


def check_eligibility_for_drive(
    student: Student,
    drive: PlacementDrive,
):
    if student.cgpa < drive.min_cgpa:
        return False, (
            f"Minimum CGPA required: "
            f"{drive.min_cgpa}"
        )

    if (
        student.tenth_percentage
        < drive.min_tenth
    ):
        return False, (
            f"Minimum 10th percentage required: "
            f"{drive.min_tenth}"
        )

    if (
        student.twelfth_percentage
        < drive.min_twelfth
    ):
        return False, (
            f"Minimum 12th percentage required: "
            f"{drive.min_twelfth}"
        )

    if (
        student.active_backlogs
        > drive.max_backlogs
    ):
        return False, (
            f"Maximum backlogs allowed: "
            f"{drive.max_backlogs}"
        )

    if drive.branches:
        allowed_branches = [
            branch.strip().upper()
            for branch in drive.branches.split(",")
            if branch.strip()
        ]

        if (
            student.branch.upper()
            not in allowed_branches
        ):
            return False, (
                "Your branch is not eligible"
            )

    if (
        drive.graduation_year
        and student.graduation_year
        != drive.graduation_year
    ):
        return False, (
            f"Graduation year must be "
            f"{drive.graduation_year}"
        )

    if (
        drive.gender
        and drive.gender.lower() != "any"
        and student.gender.lower()
        != drive.gender.lower()
    ):
        return False, (
            "Gender eligibility criteria "
            "not satisfied"
        )

    return True, None


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
    return (
        db.query(
            PlacementDrive
        )
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
            detail=(
                "Failed to upload job description: "
                f"{str(error)}"
            ),
        )

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
        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to read the "
                "Excel file: "
                f"{str(error)}"
            ),
        )

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

    source_stages = (
        get_ready_source_stages(
            drive,
            stage,
        )
    )

    next_stage = get_next_stage(
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

        application_stage = (
            normalize_stage(
                application.current_stage
            )
        )

        application_status = (
            application.status
            or "Applied"
        )

        if (
            application_stage
            not in source_stages
        ):
            continue

        if application_status in {
            "Rejected",
            "Selected",
        }:
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

            if stage == "Result":

                application.status = (
                    "Selected"
                )

                application.current_stage = (
                    "Result"
                )

            else:

                application.status = (
                    "Shortlisted"
                )

                application.current_stage = (
                    next_stage
                    if next_stage
                    else stage
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

            application.status = (
                "Rejected"
            )

            application.current_stage = (
                stage
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

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to process "
                "round results: "
                f"{str(error)}"
            ),
        )

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