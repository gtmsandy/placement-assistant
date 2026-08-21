import os
import shutil
import uuid

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile

from sqlalchemy.orm import Session

from database import get_db
from models import Student
from models import User
from routers.auth import get_current_user
from routers.auth import require_admin
from schemas import StudentCreate
from schemas import StudentResponse


router = APIRouter(
    prefix="/api/students",
    tags=["Students"],
)


RESUME_DIRECTORY = "uploads/resumes"

os.makedirs(
    RESUME_DIRECTORY,
    exist_ok=True
)


ALLOWED_RESUME_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
}


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
    student_data: StudentCreate,
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

    updated_data = (
        student_data.model_dump()
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
    if (
        current_user.role.lower() == "student"
        and current_user.student_id != student_id
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only upload your own resume",
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

    original_filename = file.filename

    extension = os.path.splitext(
        original_filename
    )[1].lower()

    if extension not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Only PDF, DOC, and DOCX resumes are allowed",
        )

    if student.resume_filename:
        old_filename = os.path.basename(
            student.resume_filename
        )

        old_path = os.path.join(
            RESUME_DIRECTORY,
            old_filename
        )

        if os.path.exists(old_path):
            os.remove(old_path)

    unique_filename = (
        f"{uuid.uuid4().hex}{extension}"
    )

    file_path = os.path.join(
        RESUME_DIRECTORY,
        unique_filename
    )

    try:
        with open(
            file_path,
            "wb"
        ) as buffer:
            shutil.copyfileobj(
                file.file,
                buffer
            )

    finally:
        await file.close()

    student.resume_filename = (
        original_filename
    )

    student.resume_url = (
        f"/uploads/resumes/{unique_filename}"
    )

    db.commit()
    db.refresh(student)

    return student