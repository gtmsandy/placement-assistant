from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Application
from models import PlacementDrive
from models import Student
from schemas import ApplicationCreate
from schemas import ApplicationResponse


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


def check_eligibility(
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
            "Gender eligibility criteria not satisfied"
        )

    return True, None


@router.get(
    "/",
    response_model=list[ApplicationResponse],
)
def get_applications(
    db: Session = Depends(get_db),
):
    return (
        db.query(Application)
        .order_by(Application.id.desc())
        .all()
    )


@router.post(
    "/",
    response_model=ApplicationResponse,
)
def create_application(
    application_data: ApplicationCreate,
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(
            Student.id
            == application_data.student_id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    drive = (
        db.query(PlacementDrive)
        .filter(
            PlacementDrive.id
            == application_data.drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail="Placement drive not found",
        )

    if drive.status != "Published":
        raise HTTPException(
            status_code=400,
            detail="This placement drive is not published",
        )

    already_applied = (
        db.query(Application)
        .filter(
            Application.student_id
            == application_data.student_id,
            Application.drive_id
            == application_data.drive_id,
        )
        .first()
    )

    if already_applied:
        raise HTTPException(
            status_code=400,
            detail="You have already applied to this drive",
        )

    eligible, reason = check_eligibility(
        student,
        drive,
    )

    if not eligible:
        raise HTTPException(
            status_code=403,
            detail=reason,
        )

    application = Application(
        student_id=application_data.student_id,
        drive_id=application_data.drive_id,
        status="Applied",
        current_stage="Applied",
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    return application


@router.patch(
    "/{application_id}",
    response_model=ApplicationResponse,
)
def update_application_status(
    application_id: int,
    status: str,
    current_stage: str = "Applied",
    db: Session = Depends(get_db),
):
    application = (
        db.query(Application)
        .filter(
            Application.id == application_id
        )
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=404,
            detail="Application not found",
        )

    allowed_statuses = [
        "Applied",
        "Shortlisted",
        "Selected",
        "Rejected",
    ]

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid application status",
        )

    allowed_stages = [
        "Applied",
        "Resume Shortlisting",
        "PPT",
        "Online Test",
        "Interview",
        "Result",
    ]

    if current_stage not in allowed_stages:
        raise HTTPException(
            status_code=400,
            detail="Invalid recruitment stage",
        )

    drive = (
        db.query(PlacementDrive)
        .filter(
            PlacementDrive.id
            == application.drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail="Placement drive not found",
        )

    if (
        current_stage == "Resume Shortlisting"
        and not drive.resume_shortlisting
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Resume shortlisting is not "
                "required for this placement drive"
            ),
        )

    if (
        status == "Selected"
        and current_stage != "Result"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Selected applications must "
                "have Result as the current stage"
            ),
        )

    if (
        status == "Applied"
        and current_stage != "Applied"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Applied applications must have "
                "Applied as the current stage"
            ),
        )

    application.status = status
    application.current_stage = current_stage

    db.commit()
    db.refresh(application)

    return application