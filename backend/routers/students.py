from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Student
from schemas import StudentCreate
from schemas import StudentResponse


router = APIRouter(
    prefix="/api/students",
    tags=["Students"],
)


@router.get(
    "/",
    response_model=list[StudentResponse],
)
def get_students(
    db: Session = Depends(get_db),
):
    return db.query(Student).all()


@router.get(
    "/{student_id}",
    response_model=StudentResponse,
)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
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
    db: Session = Depends(get_db),
):
    student = (
        db.query(Student)
        .filter(Student.id == student_id)
        .first()
    )

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    updated_data = student_data.model_dump()

    for field, value in updated_data.items():
        setattr(
            student,
            field,
            value,
        )

    db.commit()
    db.refresh(student)

    return student