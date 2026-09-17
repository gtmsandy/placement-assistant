import logging
import os

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session

from database import get_db
from models import Student
from models import User
from routers.auth import get_current_user
from routers.auth import require_admin
from schemas import StudentCreate
from schemas import StudentProfileUpdate
from schemas import StudentResponse
from upload_security import MAX_RESUME_SIZE
from upload_security import RESUME_MIME_TYPES
from upload_security import generate_safe_upload_path
from upload_security import stored_upload_path
from upload_security import validate_extension_and_mime
from upload_security import validate_resume_content
from upload_security import write_upload_with_limit


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/students",
    tags=["Students"],
)


RESUME_DIRECTORY = "uploads/resumes"

os.makedirs(
    RESUME_DIRECTORY,
    exist_ok=True
)


@router.get(
    "/",
    response_model=list[StudentResponse],
)
def get_students(
    current_user: User = Depends(
        require_admin
    ),
    db: Session = Depends(get_db),
):
    return db.query(Student).all()


@router.get(
    "/{student_id}",
    response_model=StudentResponse,
)
def get_student(
    student_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if (
        current_user.role.lower() == "student"
        and current_user.student_id != student_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only access your own profile",
        )

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
            detail="Student not found",
        )

    return student


@router.post(
    "/",
    response_model=StudentResponse,
)
def create_student(
    student_data: StudentCreate,
    current_user: User = Depends(
        require_admin
    ),
    db: Session = Depends(get_db),
):
    existing_student = (
        db.query(Student)
        .filter(
            Student.email == student_data.email
        )
        .first()
    )

    if existing_student:
        raise HTTPException(
            status_code=400,
            detail="Student with this email already exists",
        )

    student = Student(
        **student_data.model_dump()
    )

    db.add(student)
    db.commit()
    db.refresh(student)

    return student


@router.patch(
    "/{student_id}",
    response_model=StudentResponse,
)
def update_student(
    student_id: int,
    student_data: StudentProfileUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    if (
        current_user.role.lower() == "student"
        and current_user.student_id != student_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only update your own profile",
        )

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
            detail="Student not found",
        )

    updated_data = student_data.model_dump(
        exclude_unset=True
    )

    for field, value in updated_data.items():
        setattr(
            student,
            field,
            value,
        )

    db.commit()
    db.refresh(student)

    return student


@router.post(
    "/{student_id}/resume",
    response_model=StudentResponse,
)
async def upload_resume(
    student_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    user_role = current_user.role.lower()

    if user_role == "student" and (
        current_user.student_id != student_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only upload your own resume",
        )

    if user_role not in {
        "admin",
        "student",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You are not authorized to "
                "upload resumes"
            ),
        )

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
            detail="Student not found",
        )

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No resume file was provided",
        )

    destination = None
    old_path = stored_upload_path(
        RESUME_DIRECTORY,
        student.resume_url,
        "/uploads/resumes",
    )

    try:
        extension = validate_extension_and_mime(
            file,
            RESUME_MIME_TYPES,
            (
                "Only PDF, DOC, and DOCX "
                "resumes are allowed"
            ),
        )

        destination = generate_safe_upload_path(
            RESUME_DIRECTORY,
            extension,
        )

        await write_upload_with_limit(
            file,
            destination,
            MAX_RESUME_SIZE,
        )

        validate_resume_content(
            destination,
            extension,
        )

        display_filename = os.path.basename(
            file.filename.replace(
                "\\",
                "/",
            )
        )

        student.resume_filename = (
            display_filename
        )

        student.resume_url = (
            f"/uploads/resumes/{destination.name}"
        )

        db.commit()
        db.refresh(student)

        if (
            old_path
            and old_path != destination
            and old_path.exists()
        ):
            try:
                old_path.unlink()
            except OSError:
                logger.warning(
                    "Unable to remove replaced resume file",
                    exc_info=True,
                )

        return student

    except HTTPException:
        db.rollback()

        if (
            destination
            and destination.exists()
        ):
            try:
                destination.unlink()
            except OSError:
                logger.warning(
                    "Unable to remove rejected resume upload",
                    exc_info=True,
                )

        raise

    except Exception as error:
        db.rollback()

        if (
            destination
            and destination.exists()
        ):
            try:
                destination.unlink()
            except OSError:
                logger.warning(
                    "Unable to remove failed resume upload",
                    exc_info=True,
                )

        logger.exception(
            "Unexpected error while uploading resume"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to upload resume.",
        ) from error

    finally:
        await file.close()


@router.get(
    "/{student_id}/resume",
)
def download_resume(
    student_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    user_role = current_user.role.lower()

    if user_role == "student" and (
        current_user.student_id != student_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You can only access your "
                "own resume"
            ),
        )

    if user_role not in {
        "admin",
        "student",
    }:
        raise HTTPException(
            status_code=403,
            detail=(
                "You are not authorized to "
                "access resumes"
            ),
        )

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
            detail="Student not found",
        )

    resume_path = stored_upload_path(
        RESUME_DIRECTORY,
        student.resume_url,
        "/uploads/resumes",
    )

    if (
        not resume_path
        or not resume_path.is_file()
    ):
        raise HTTPException(
            status_code=404,
            detail="Resume not found",
        )

    extension = resume_path.suffix.lower()
    media_types = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": (
            "application/vnd.openxmlformats-"
            "officedocument.wordprocessingml.document"
        ),
    }
    download_name = os.path.basename(
        (
            student.resume_filename
            or resume_path.name
        ).replace("\\", "/")
    )

    return FileResponse(
        path=resume_path,
        media_type=media_types.get(
            extension,
            "application/octet-stream",
        ),
        filename=download_name,
    )
