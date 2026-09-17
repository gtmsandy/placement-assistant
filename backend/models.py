import uuid
from datetime import datetime
from datetime import timezone

from sqlalchemy import Boolean
from sqlalchemy import CheckConstraint
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Float
from sqlalchemy import ForeignKey
from sqlalchemy import Index
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import UniqueConstraint
from sqlalchemy import Uuid
from sqlalchemy import text as sql_text

from database import Base


class Student(Base):
    __tablename__ = "students"

    __table_args__ = (
        UniqueConstraint(
            "mobile",
            name="uq_students_mobile",
        ),
    )

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

    resume_filename = Column(
        String(255),
        nullable=True
    )

    resume_url = Column(
        String(500),
        nullable=True
    )


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            name="uq_users_student_id",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    username = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(20),
        nullable=False,
        default="student"
    )

    student_id = Column(
        Integer,
        ForeignKey("students.id"),
        nullable=True
    )

    auth_version = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    password_changed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"

    __table_args__ = (
        CheckConstraint(
            "purpose = 'password_recovery'",
            name="ck_otp_challenges_purpose",
        ),
        CheckConstraint(
            "identifier_kind IN ('email', 'mobile', 'unknown')",
            name="ck_otp_challenges_identifier_kind",
        ),
        CheckConstraint(
            "channel IN ('email', 'sms', 'none')",
            name="ck_otp_challenges_channel",
        ),
        CheckConstraint(
            "attempts >= 0",
            name="ck_otp_challenges_attempts_nonnegative",
        ),
        CheckConstraint(
            "resend_count >= 0",
            name="ck_otp_challenges_resend_count_nonnegative",
        ),
        CheckConstraint(
            "delivery_status IN ('pending', 'sent', 'suppressed', 'failed')",
            name="ck_otp_challenges_delivery_status",
        ),
        Index(
            "ix_otp_challenges_identifier_purpose_created",
            "identifier_fingerprint",
            "purpose",
            "created_at",
        ),
        Index(
            "ix_otp_challenges_user_purpose_created",
            "user_id",
            "purpose",
            "created_at",
        ),
        Index(
            "ix_otp_challenges_expires_at",
            "expires_at",
        ),
        Index(
            "uq_otp_challenges_active_identifier_purpose",
            "identifier_fingerprint",
            "purpose",
            unique=True,
            postgresql_where=sql_text(
                "consumed_at IS NULL AND invalidated_at IS NULL"
            ),
            sqlite_where=sql_text(
                "consumed_at IS NULL AND invalidated_at IS NULL"
            ),
        ),
    )

    id = Column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            name="fk_otp_challenges_user_id_users",
            ondelete="CASCADE",
        ),
        nullable=True,
    )

    identifier_fingerprint = Column(
        String(64),
        nullable=False,
    )

    identifier_kind = Column(
        String(20),
        nullable=False,
    )

    purpose = Column(
        String(40),
        nullable=False,
    )

    channel = Column(
        String(20),
        nullable=False,
    )

    otp_digest = Column(
        String(64),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    last_sent_at = Column(
        DateTime(timezone=True),
        nullable=False,
    )

    attempts = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    resend_count = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    verified_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    consumed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    invalidated_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    reset_jti_digest = Column(
        String(64),
        nullable=True,
    )

    reset_authorized_until = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    delivery_status = Column(
        String(20),
        nullable=False,
        default="pending",
        server_default="pending",
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

    pwd_eligibility = Column(
        String(20),
        nullable=False,
        default="Any",
        server_default="Any",
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

    jd_filename = Column(
        String(255),
        nullable=True
    )

    status = Column(
        String(30),
        default="Published"
    )


class Application(Base):
    __tablename__ = "applications"

    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "drive_id",
            name="uq_applications_student_drive",
        ),
        Index(
            "ix_applications_drive_id",
            "drive_id",
        ),
    )

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    student_id = Column(
        Integer,
        ForeignKey(
            "students.id",
            name="fk_applications_student_id_students",
            ondelete="RESTRICT",
        ),
        nullable=False
    )

    drive_id = Column(
        Integer,
        ForeignKey(
            "placement_drives.id",
            name="fk_applications_drive_id_placement_drives",
            ondelete="RESTRICT",
        ),
        nullable=False
    )

    status = Column(
        String(30),
        default="Applied",
        nullable=False
    )

    current_stage = Column(
        String(50),
        default="Applied",
        nullable=False
    )

    applied_at = Column(
        DateTime,
        default=datetime.utcnow
    )
