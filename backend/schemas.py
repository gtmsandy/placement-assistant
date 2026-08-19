from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from pydantic import ConfigDict


class StudentBase(BaseModel):
    name: str
    email: str
    roll_no: str

    mobile: Optional[str] = None
    personal_email: Optional[str] = None

    branch: str
    graduation_year: int

    cgpa: float
    tenth_percentage: float
    twelfth_percentage: float

    active_backlogs: int = 0

    history_of_backlogs: bool = False

    gender: str = "Any"

    specially_abled: bool = False


class StudentCreate(StudentBase):
    pass


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

    min_cgpa: float = 0
    min_tenth: float = 0
    min_twelfth: float = 0

    max_backlogs: int = 0

    branches: Optional[str] = None

    gender: str = "Any"

    graduation_year: Optional[int] = None

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

    min_cgpa: Optional[float] = None
    min_tenth: Optional[float] = None
    min_twelfth: Optional[float] = None

    max_backlogs: Optional[int] = None

    branches: Optional[str] = None

    gender: Optional[str] = None

    graduation_year: Optional[int] = None

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