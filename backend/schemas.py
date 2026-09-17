from datetime import datetime
from typing import Literal
from typing import Optional

from pydantic import BaseModel
from pydantic import ConfigDict
from pydantic import Field
from pydantic import field_validator

from auth_identifiers import normalize_optional_mobile


class StudentBase(BaseModel):
    name: str

    email: str

    roll_no: str

    mobile: Optional[str] = None

    personal_email: Optional[str] = None

    branch: str

    graduation_year: int = Field(
        ge=1900,
        le=2100,
    )

    cgpa: float = Field(
        ge=0,
        le=10,
    )

    tenth_percentage: float = Field(
        ge=0,
        le=100,
    )

    twelfth_percentage: float = Field(
        ge=0,
        le=100,
    )

    active_backlogs: int = Field(
        default=0,
        ge=0,
    )

    history_of_backlogs: bool = False

    gender: str = "Any"

    specially_abled: Optional[bool] = False

    resume_filename: Optional[str] = None

    resume_url: Optional[str] = None

    @field_validator(
        "mobile",
        mode="before",
    )
    @classmethod
    def normalize_mobile(
        cls,
        value: str | None,
    ) -> str | None:
        return normalize_optional_mobile(
            value
        )


class StudentCreate(StudentBase):
    pass


class StudentProfileUpdate(BaseModel):
    """Fields a student is allowed to edit themselves."""

    mobile: Optional[str] = None

    personal_email: Optional[str] = None

    @field_validator(
        "mobile",
        mode="before",
    )
    @classmethod
    def normalize_mobile(
        cls,
        value: str | None,
    ) -> str | None:
        return normalize_optional_mobile(
            value
        )


class StudentResponse(StudentBase):
    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class DriveBase(BaseModel):
    company_name: str

    role: str

    ctc: Optional[str] = None

    location: Optional[str] = None

    min_cgpa: float = Field(
        default=0,
        ge=0,
        le=10,
    )

    min_tenth: float = Field(
        default=0,
        ge=0,
        le=100,
    )

    min_twelfth: float = Field(
        default=0,
        ge=0,
        le=100,
    )

    max_backlogs: int = Field(
        default=0,
        ge=0,
    )

    branches: Optional[str] = None

    gender: str = "Any"

    pwd_eligibility: Literal[
        "Any",
        "PwD Only",
        "Non-PwD Only",
    ] = "Any"

    graduation_year: Optional[int] = Field(
        default=None,
        ge=1900,
        le=2100,
    )

    resume_shortlisting: bool = False

    deadline: Optional[datetime] = None

    ppt: Optional[datetime] = None

    online_test: Optional[datetime] = None

    interview: Optional[datetime] = None

    registration_link: Optional[str] = None

    jd: Optional[str] = None

    jd_filename: Optional[str] = None

    status: str = "Published"


class DriveCreate(DriveBase):
    pass


class DriveUpdate(BaseModel):
    company_name: Optional[str] = None

    role: Optional[str] = None

    ctc: Optional[str] = None

    location: Optional[str] = None

    min_cgpa: Optional[float] = Field(
        default=None,
        ge=0,
        le=10,
    )

    min_tenth: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
    )

    min_twelfth: Optional[float] = Field(
        default=None,
        ge=0,
        le=100,
    )

    max_backlogs: Optional[int] = Field(
        default=None,
        ge=0,
    )

    branches: Optional[str] = None

    gender: Optional[str] = None

    pwd_eligibility: Optional[
        Literal[
            "Any",
            "PwD Only",
            "Non-PwD Only",
        ]
    ] = None

    graduation_year: Optional[int] = Field(
        default=None,
        ge=1900,
        le=2100,
    )

    resume_shortlisting: Optional[bool] = None

    deadline: Optional[datetime] = None

    ppt: Optional[datetime] = None

    online_test: Optional[datetime] = None

    interview: Optional[datetime] = None

    registration_link: Optional[str] = None

    jd: Optional[str] = None

    jd_filename: Optional[str] = None

    status: Optional[str] = None


class DriveResponse(DriveBase):
    id: int

    model_config = ConfigDict(
        from_attributes=True
    )


class ApplicationCreate(BaseModel):
    student_id: int

    drive_id: int


class ApplicationUpdate(BaseModel):
    status: Optional[str] = None

    current_stage: Optional[str] = None


class ApplicationResponse(BaseModel):
    id: int

    student_id: int

    drive_id: int

    status: str

    current_stage: str

    applied_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )
