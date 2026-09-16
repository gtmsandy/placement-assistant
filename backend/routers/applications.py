import logging

from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application_state import ApplicationTransitionError
from application_state import initial_application_state
from application_state import transition_application
from database import get_db
from eligibility import check_eligibility
from models import Application
from models import PlacementDrive
from models import Student
from models import User
from schemas import ApplicationCreate
from schemas import ApplicationResponse
from routers.auth import get_current_user
from routers.auth import require_admin


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/applications",
    tags=["Applications"],
)


@router.get(
    "/",
    response_model=list[ApplicationResponse],
)
def get_applications(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    user_role = current_user.role.lower()

    if user_role == "admin":
        return (
            db.query(Application)
            .order_by(Application.id.desc())
            .all()
        )

    if user_role == "student":
        if current_user.student_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Student account is not linked "
                    "to a student profile"
                ),
            )

        return (
            db.query(Application)
            .filter(
                Application.student_id
                == current_user.student_id
            )
            .order_by(Application.id.desc())
            .all()
        )

    raise HTTPException(
        status_code=403,
        detail="You are not authorized to view applications",
    )


@router.post(
    "/",
    response_model=ApplicationResponse,
)
def create_application(
    application_data: ApplicationCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    user_role = current_user.role.lower()

    if user_role not in ["admin", "student"]:
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to create applications",
        )

    if user_role == "student":
        if current_user.student_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Student account is not linked "
                    "to a student profile"
                ),
            )

        if (
            application_data.student_id
            != current_user.student_id
        ):
            raise HTTPException(
                status_code=403,
                detail=(
                    "Students can only create "
                    "applications for themselves"
                ),
            )

        student_id = current_user.student_id

    else:
        student_id = application_data.student_id

    student = (
        db.query(Student)
        .filter(
            Student.id == student_id
        )
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found",
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
            detail=(
                "This placement drive is not published"
            ),
        )

    already_applied = (
        db.query(Application)
        .filter(
            Application.student_id
            == student_id,
            Application.drive_id
            == application_data.drive_id,
        )
        .first()
    )

    if already_applied:
        raise HTTPException(
            status_code=400,
            detail=(
                "This student has already "
                "applied to this drive"
            ),
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

    initial_state = initial_application_state(
        drive.resume_shortlisting
    )

    application = Application(
        student_id=student_id,
        drive_id=application_data.drive_id,
        status=initial_state.status,
        current_stage=initial_state.current_stage,
    )

    try:
        db.add(application)
        db.commit()
        db.refresh(application)

        return application

    except IntegrityError as error:
        db.rollback()

        constraint_name = getattr(
            getattr(error.orig, "diag", None),
            "constraint_name",
            None,
        )

        if constraint_name == "uq_applications_student_drive":
            raise HTTPException(
                status_code=409,
                detail=(
                    "This student has already "
                    "applied to this drive"
                ),
            ) from error

        raise HTTPException(
            status_code=409,
            detail=(
                "Application could not be created because "
                "related records are invalid"
            ),
        ) from error

    except Exception as error:
        db.rollback()

        logger.exception(
            "Unexpected error while creating application"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to create application.",
        ) from error


@router.patch(
    "/{application_id}",
    response_model=ApplicationResponse,
)
def update_application_status(
    application_id: int,
    status: str,
    current_stage: str = "Applied",
    current_user: User = Depends(
        require_admin
    ),
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

    drive = (
        db.query(PlacementDrive)
        .filter(
            PlacementDrive.id == application.drive_id
        )
        .first()
    )

    if not drive:
        raise HTTPException(
            status_code=404,
            detail="Placement drive not found",
        )

    try:
        transition_application(
            application,
            drive.resume_shortlisting,
            status,
            current_stage,
        )
    except ApplicationTransitionError as error:
        raise HTTPException(
            status_code=error.http_status,
            detail=str(error),
        ) from error

    db.commit()
    db.refresh(application)

    return application
