from fastapi import APIRouter
from fastapi import Depends
from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import PlacementDrive
from schemas import DriveCreate
from schemas import DriveResponse
from schemas import DriveUpdate


router = APIRouter(
    prefix="/api/drives",
    tags=["Placement Drives"],
)


@router.get(
    "/",
    response_model=list[DriveResponse],
)
def get_drives(
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
            detail=f"Failed to create placement drive: {str(error)}",
        )


@router.patch(
    "/{drive_id}",
    response_model=DriveResponse,
)
def update_drive(
    drive_id: int,
    drive_data: DriveUpdate,
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
            detail=f"Failed to update placement drive: {str(error)}",
        )