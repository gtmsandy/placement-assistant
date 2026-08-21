import os
import uuid

from fastapi import APIRouter
from fastapi import Depends
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile

from sqlalchemy.orm import Session

from database import get_db
from models import PlacementDrive
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
        .order_by(PlacementDrive.id.desc())
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

        return drive

    except Exception as error:
        db.rollback()

        if os.path.exists(file_path):
            os.remove(file_path)

        raise HTTPException(
            status_code=500,
            detail=(
                "Failed to upload job description: "
                f"{str(error)}"
            ),
        )