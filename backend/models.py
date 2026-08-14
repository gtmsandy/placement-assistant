from datetime import datetime

from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Float
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

from database import Base


class Student(Base):
    __tablename__ = "students"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False
    )

    roll_no = Column(
        String(50),
        unique=True,
        nullable=False
    )

    mobile = Column(
        String(20)
    )

    personal_email = Column(
        String(150)
    )

    branch = Column(
        String(50),
        nullable=False
    )

    graduation_year = Column(
        Integer,
        nullable=False
    )

    cgpa = Column(
        Float,
        nullable=False
    )

    tenth_percentage = Column(
        Float,
        nullable=False
    )

    twelfth_percentage = Column(
        Float,
        nullable=False
    )

    active_backlogs = Column(
        Integer,
        default=0
    )

    history_of_backlogs = Column(
        Boolean,
        default=False
    )

    gender = Column(
        String(20),
        default="Any"
    )

    specially_abled = Column(
        Boolean,
        default=False
    )


class PlacementDrive(Base):
    __tablename__ = "placement_drives"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    company_name = Column(
        String(150),
        nullable=False
    )

    role = Column(
        String(150),
        nullable=False
    )

    ctc = Column(
        String(50)
    )

    location = Column(
        String(100)
    )

    min_cgpa = Column(
        Float,
        default=0
    )

    min_tenth = Column(
        Float,
        default=0
    )

    min_twelfth = Column(
        Float,
        default=0
    )

    max_backlogs = Column(
        Integer,
        default=0
    )

    branches = Column(
        String(300)
    )

    gender = Column(
        String(20),
        default="Any"
    )

    graduation_year = Column(
        Integer
    )

    resume_shortlisting = Column(
        Boolean,
        default=False,
        nullable=False
    )

    deadline = Column(
        DateTime
    )

    ppt = Column(
        DateTime
    )

    online_test = Column(
        DateTime
    )

    interview = Column(
        DateTime
    )

    registration_link = Column(
        String(500)
    )

    jd = Column(
        Text
    )

    status = Column(
        String(30),
        default="Published"
    )


class Application(Base):
    __tablename__ = "applications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    student_id = Column(
        Integer,
        nullable=False
    )

    drive_id = Column(
        Integer,
        nullable=False
    )

    status = Column(
        String(30),
        default="Applied"
    )

    applied_at = Column(
        DateTime,
        default=datetime.utcnow
    )