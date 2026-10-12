import logging
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from blob_signer_client import BlobSignerError
from blob_storage import BlobStorageError
from blob_storage import create_blob_download_url
from blob_storage import create_blob_upload_url
from blob_storage import delete_private_blob
from blob_storage import read_private_blob
from blob_uploads import generate_blob_pathname
from blob_uploads import validate_blob_pathname
from models import Student
from models import User
from routers.auth import get_current_user
from routers.auth import require_admin
from schemas import BlobUploadAuthorization
from schemas import BlobUploadFinalizeRequest
from schemas import BlobUploadRequest
from schemas import StudentCreate
from schemas import StudentProfileUpdate
from schemas import StudentResponse
from storage_config import RESUME_DIRECTORY
from storage_config import blob_storage_enabled
from upload_security import MAX_RESUME_SIZE
from upload_security import RESUME_MIME_TYPES
from upload_security import generate_safe_upload_path
from upload_security import stored_upload_path
from upload_security import validate_extension_and_mime
from upload_security import validate_filename_and_mime
from upload_security import validate_resume_content
from upload_security import write_upload_with_limit


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/students",
    tags=["Students"],
)


if not blob_storage_enabled():
    os.makedirs(
        RESUME_DIRECTORY,
        exist_ok=True
    )


def _resume_user_is_authorized(current_user, student_id, action):
    user_role = current_user.role.lower()

    if user_role == "student" and current_user.student_id != student_id:
        raise HTTPException(
            status_code=403,
            detail=f"You can only {action} your own resume",
        )

    if user_role not in {"admin", "student"}:
        raise HTTPException(
            status_code=403,
            detail=f"You are not authorized to {action} resumes",
        )


def _delete_resume_blob_quietly(pathname):
    try:
        delete_private_blob(
            kind="resume",
            pathname=pathname,
        )
    except BlobSignerError:
        logger.warning(
            "Unable to remove private resume Blob",
            exc_info=True,
        )
    except BlobStorageError:
        logger.warning(
            "Unable to remove private resume Blob",
            exc_info=True,
        )


def _is_mobile_unique_violation(error):
    constraint_name = getattr(
        getattr(
            getattr(error, "orig", None),
            "diag",
            None,
        ),
        "constraint_name",
        None,
    )
    if constraint_name == "uq_students_mobile":
        return True

    return (
        "unique constraint failed: students.mobile"
        in str(getattr(error, "orig", "")).lower()
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

    mobile = updated_data.get("mobile")

    if mobile is not None:
        existing_mobile = (
            db.query(Student.id)
            .filter(
                Student.mobile == mobile,
                Student.id != student_id,
            )
            .first()
        )

        if existing_mobile:
            raise HTTPException(
                status_code=409,
                detail="Mobile number is already registered.",
            )

    try:
        for field, value in updated_data.items():
            setattr(
                student,
                field,
                value,
            )

        db.commit()
        db.refresh(student)

    except IntegrityError as error:
        db.rollback()

        if _is_mobile_unique_violation(error):
            raise HTTPException(
                status_code=409,
                detail="Mobile number is already registered.",
            ) from error

        raise

    return student


@router.post(
    "/{student_id}/resume/upload-url",
    response_model=BlobUploadAuthorization,
)
def create_resume_upload_url(
    student_id: int,
    request: BlobUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _resume_user_is_authorized(current_user, student_id, "upload")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    extension = validate_filename_and_mime(
        request.filename,
        request.content_type,
        RESUME_MIME_TYPES,
        "Only PDF, DOC, and DOCX resumes are allowed",
    )
    pathname = generate_blob_pathname(
        kind="resume",
        owner_id=student_id,
        extension=extension,
    )

    try:
        upload_url = create_blob_upload_url(
            kind="resume",
            pathname=pathname,
        )
    except (BlobSignerError, BlobStorageError) as error:
        logger.exception("Unable to authorize private resume upload")
        raise HTTPException(
            status_code=503,
            detail="File storage is temporarily unavailable.",
        ) from error

    return BlobUploadAuthorization(
        pathname=pathname,
        upload_url=upload_url,
    )


@router.post(
    "/{student_id}/resume/finalize",
    response_model=StudentResponse,
)
def finalize_resume_upload(
    student_id: int,
    request: BlobUploadFinalizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _resume_user_is_authorized(current_user, student_id, "upload")

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    stored_extension = validate_blob_pathname(
        kind="resume",
        owner_id=student_id,
        pathname=request.pathname,
        allowed_extensions=set(RESUME_MIME_TYPES),
    )
    try:
        extension = validate_filename_and_mime(
            request.filename,
            request.content_type,
            RESUME_MIME_TYPES,
            "Only PDF, DOC, and DOCX resumes are allowed",
        )
        if stored_extension != extension:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file metadata does not match its reference.",
            )

        contents = read_private_blob(
            kind="resume",
            pathname=request.pathname,
            maximum_bytes=MAX_RESUME_SIZE,
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            validation_path = (
                Path(temporary_directory) / f"resume{extension}"
            )
            validation_path.write_bytes(contents)
            validate_resume_content(validation_path, extension)
    except HTTPException:
        _delete_resume_blob_quietly(request.pathname)
        raise
    except (BlobSignerError, BlobStorageError) as error:
        _delete_resume_blob_quietly(request.pathname)
        logger.exception("Unable to validate private resume upload")
        raise HTTPException(
            status_code=503,
            detail="File storage is temporarily unavailable.",
        ) from error
    except Exception as error:
        _delete_resume_blob_quietly(request.pathname)
        logger.exception("Unexpected private resume validation failure")
        raise HTTPException(
            status_code=500,
            detail="Failed to upload resume.",
        ) from error

    old_pathname = student.resume_url
    student.resume_filename = os.path.basename(
        request.filename.replace("\\", "/")
    )
    student.resume_url = request.pathname

    try:
        db.commit()
        db.refresh(student)
    except Exception as error:
        db.rollback()
        _delete_resume_blob_quietly(request.pathname)
        logger.exception("Unable to save private resume reference")
        raise HTTPException(
            status_code=500,
            detail="Failed to upload resume.",
        ) from error

    if old_pathname and old_pathname != request.pathname:
        try:
            validate_blob_pathname(
                kind="resume",
                owner_id=student_id,
                pathname=old_pathname,
                allowed_extensions=set(RESUME_MIME_TYPES),
            )
        except HTTPException:
            pass
        else:
            _delete_resume_blob_quietly(old_pathname)

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
    if blob_storage_enabled():
        raise HTTPException(
            status_code=409,
            detail="Use the direct file upload flow.",
        )

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

    if str(student.resume_url or "").startswith("resumes/"):
        validate_blob_pathname(
            kind="resume",
            owner_id=student_id,
            pathname=student.resume_url,
            allowed_extensions=set(RESUME_MIME_TYPES),
        )
        try:
            download_url = create_blob_download_url(
                kind="resume",
                pathname=student.resume_url,
            )
        except (BlobSignerError, BlobStorageError) as error:
            logger.exception("Unable to authorize private resume download")
            raise HTTPException(
                status_code=503,
                detail="File storage is temporarily unavailable.",
            ) from error

        return RedirectResponse(
            url=download_url,
            status_code=307,
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
