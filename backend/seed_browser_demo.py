"""Manage clearly disposable data for authenticated browser verification.

This utility is manual-only and is never imported by application startup.

Examples, run from ``backend``::

    python seed_browser_demo.py status
    python seed_browser_demo.py seed --confirm-target supabase-browser-demo
    python seed_browser_demo.py cleanup --confirm-target supabase-browser-demo

The mutating commands deliberately require both a PostgreSQL Supabase session
pooler target and an explicit confirmation phrase. They never create schema.
"""

import argparse
import os
from datetime import datetime

from sqlalchemy import inspect
from sqlalchemy import or_

from database import SessionLocal
from database import engine
from models import Application
from models import PlacementDrive
from models import Student
from models import User
from routers.auth import hash_password


CONFIRMATION_PHRASE = "supabase-browser-demo"

DEMO_ADMIN_USERNAME = "demo_admin"
DEMO_STUDENT_USERNAME = "demo_student"
DEMO_STUDENT_ROLL_NO = "DEMO001"
DEMO_STUDENT_EMAIL = "demo.student@example.test"

DEMO_DRIVES = (
    {
        "company_name": "Demo Placement Drive - Resume",
        "role": "Demo Software Engineer",
        "ctc": "12 LPA",
        "location": "Demo Campus",
        "min_cgpa": 7.0,
        "min_tenth": 70.0,
        "min_twelfth": 70.0,
        "max_backlogs": 0,
        "branches": "CSE",
        "gender": "Any",
        "graduation_year": 2027,
        "resume_shortlisting": True,
        "deadline": datetime(2027, 12, 31, 23, 59),
        "status": "Published",
    },
    {
        "company_name": "Demo Placement Drive - Direct",
        "role": "Demo Platform Engineer",
        "ctc": "10 LPA",
        "location": "Demo Campus",
        "min_cgpa": 7.0,
        "min_tenth": 70.0,
        "min_twelfth": 70.0,
        "max_backlogs": 0,
        "branches": "CSE",
        "gender": "Any",
        "graduation_year": 2027,
        "resume_shortlisting": False,
        "deadline": datetime(2027, 12, 31, 23, 59),
        "status": "Published",
    },
    {
        "company_name": "Demo Placement Drive - Draft",
        "role": "Demo Data Engineer",
        "ctc": "11 LPA",
        "location": "Demo Campus",
        "min_cgpa": 7.0,
        "min_tenth": 70.0,
        "min_twelfth": 70.0,
        "max_backlogs": 0,
        "branches": "CSE",
        "gender": "Any",
        "graduation_year": 2027,
        "resume_shortlisting": True,
        "deadline": datetime(2027, 12, 31, 23, 59),
        "status": "Draft",
    },
)

REQUIRED_TABLES = {
    "students",
    "users",
    "placement_drives",
    "applications",
    "alembic_version",
}


def verify_database_target():
    url = engine.url
    backend_name = url.get_backend_name()
    hostname = (url.host or "").lower()

    if backend_name != "postgresql":
        raise RuntimeError(
            "Browser demo data may only target PostgreSQL; "
            f"found driver '{backend_name}'"
        )

    if not hostname.endswith(".pooler.supabase.com"):
        raise RuntimeError(
            "Browser demo data requires a Supabase pooler hostname"
        )

    if url.port != 5432:
        raise RuntimeError(
            "Browser demo data requires the Supabase session pooler "
            "on port 5432"
        )

    tables = set(inspect(engine).get_table_names())
    missing_tables = sorted(REQUIRED_TABLES - tables)
    if missing_tables:
        raise RuntimeError(
            "Required migrated tables are missing: "
            + ", ".join(missing_tables)
        )

    return {
        "driver": url.drivername,
        "hostname": hostname,
        "port": url.port,
        "database": url.database,
    }


def print_target(target):
    print("Database target verified:")
    print(f"  driver: {target['driver']}")
    print(f"  hostname: {target['hostname']}")
    print(f"  port: {target['port']}")
    print(f"  database: {target['database']}")


def exact_demo_student(db):
    matches = (
        db.query(Student)
        .filter(
            or_(
                Student.roll_no == DEMO_STUDENT_ROLL_NO,
                Student.email == DEMO_STUDENT_EMAIL,
            )
        )
        .all()
    )

    if len(matches) > 1:
        raise RuntimeError(
            "Demo student identifiers belong to different records"
        )

    if not matches:
        return None

    student = matches[0]
    if (
        student.roll_no != DEMO_STUDENT_ROLL_NO
        or student.email != DEMO_STUDENT_EMAIL
    ):
        raise RuntimeError(
            "A demo student identifier collides with a non-demo record"
        )

    return student


def exact_demo_drive(db, specification):
    matches = (
        db.query(PlacementDrive)
        .filter(
            PlacementDrive.company_name
            == specification["company_name"]
        )
        .all()
    )

    if len(matches) > 1:
        raise RuntimeError(
            "Duplicate demo drives already exist for "
            f"'{specification['company_name']}'"
        )

    if not matches:
        return None

    drive = matches[0]
    if drive.role != specification["role"]:
        raise RuntimeError(
            "A demo drive identifier collides with a non-demo record: "
            f"{specification['company_name']}"
        )

    return drive


def set_attributes(record, values):
    for field, value in values.items():
        setattr(record, field, value)


def require_demo_password():
    password = os.getenv("BROWSER_DEMO_PASSWORD")
    if not password:
        raise RuntimeError(
            "BROWSER_DEMO_PASSWORD must be set for seed operations"
        )
    return password


def seed_demo_data(db):
    created = []
    updated = []
    demo_password = require_demo_password()

    student_values = {
        "name": "Demo Student",
        "email": DEMO_STUDENT_EMAIL,
        "roll_no": DEMO_STUDENT_ROLL_NO,
        "mobile": "",
        "personal_email": "",
        "branch": "CSE",
        "graduation_year": 2027,
        "cgpa": 8.2,
        "tenth_percentage": 82.0,
        "twelfth_percentage": 80.0,
        "active_backlogs": 0,
        "history_of_backlogs": False,
        "gender": "Any",
        "specially_abled": False,
    }
    student = exact_demo_student(db)
    if student is None:
        student = Student(**student_values)
        db.add(student)
        db.flush()
        created.append("student:DEMO001")
    else:
        set_attributes(student, student_values)
        updated.append("student:DEMO001")

    user_specs = (
        {
            "username": DEMO_ADMIN_USERNAME,
            "role": "admin",
            "student_id": None,
        },
        {
            "username": DEMO_STUDENT_USERNAME,
            "role": "student",
            "student_id": student.id,
        },
    )

    for specification in user_specs:
        user = (
            db.query(User)
            .filter(User.username == specification["username"])
            .one_or_none()
        )
        if user is None:
            user = User(username=specification["username"])
            db.add(user)
            created.append(f"user:{specification['username']}")
        else:
            if user.role != specification["role"]:
                raise RuntimeError(
                    "Demo username collides with a differently scoped user: "
                    f"{specification['username']}"
                )
            if user.student_id not in {
                None,
                specification["student_id"],
            }:
                raise RuntimeError(
                    "Demo username is linked to a non-demo student: "
                    f"{specification['username']}"
                )
            updated.append(f"user:{specification['username']}")

        user.role = specification["role"]
        user.student_id = specification["student_id"]
        user.password_hash = hash_password(demo_password)

    for specification in DEMO_DRIVES:
        drive = exact_demo_drive(db, specification)
        if drive is None:
            drive = PlacementDrive()
            db.add(drive)
            created.append(f"drive:{specification['company_name']}")
        else:
            updated.append(f"drive:{specification['company_name']}")
        set_attributes(drive, specification)

    db.commit()
    return created, updated


def cleanup_demo_data(db):
    student = exact_demo_student(db)
    drives = [
        drive
        for specification in DEMO_DRIVES
        if (drive := exact_demo_drive(db, specification)) is not None
    ]

    application_filters = []
    if student is not None:
        application_filters.append(Application.student_id == student.id)
    if drives:
        application_filters.append(
            Application.drive_id.in_([drive.id for drive in drives])
        )

    removed_applications = 0
    if application_filters:
        removed_applications = (
            db.query(Application)
            .filter(or_(*application_filters))
            .delete(synchronize_session=False)
        )

    users = (
        db.query(User)
        .filter(
            User.username.in_([
                DEMO_ADMIN_USERNAME,
                DEMO_STUDENT_USERNAME,
            ])
        )
        .all()
    )

    for user in users:
        if user.username == DEMO_ADMIN_USERNAME:
            if user.role != "admin" or user.student_id is not None:
                raise RuntimeError(
                    "Refusing to clean up a non-demo admin collision"
                )
        elif (
            user.role != "student"
            or student is None
            or user.student_id != student.id
        ):
            raise RuntimeError(
                "Refusing to clean up a non-demo student collision"
            )

    removed_users = 0
    if users:
        removed_users = (
            db.query(User)
            .filter(User.id.in_([user.id for user in users]))
            .delete(synchronize_session=False)
        )

    removed_drives = 0
    if drives:
        removed_drives = (
            db.query(PlacementDrive)
            .filter(PlacementDrive.id.in_([drive.id for drive in drives]))
            .delete(synchronize_session=False)
        )

    removed_students = 0
    if student is not None:
        removed_students = (
            db.query(Student)
            .filter(Student.id == student.id)
            .delete(synchronize_session=False)
        )

    db.commit()
    return {
        "applications": removed_applications,
        "users": removed_users,
        "drives": removed_drives,
        "students": removed_students,
    }


def demo_status(db):
    student = exact_demo_student(db)
    users = (
        db.query(User)
        .filter(
            User.username.in_([
                DEMO_ADMIN_USERNAME,
                DEMO_STUDENT_USERNAME,
            ])
        )
        .all()
    )
    drives = [
        drive
        for specification in DEMO_DRIVES
        if (drive := exact_demo_drive(db, specification)) is not None
    ]

    application_count = 0
    if student is not None or drives:
        filters = []
        if student is not None:
            filters.append(Application.student_id == student.id)
        if drives:
            filters.append(
                Application.drive_id.in_([drive.id for drive in drives])
            )
        application_count = (
            db.query(Application)
            .filter(or_(*filters))
            .count()
        )

    return {
        "students": 1 if student is not None else 0,
        "users": len(users),
        "drives": len(drives),
        "applications": application_count,
    }


def require_confirmation(arguments):
    if arguments.confirm_target != CONFIRMATION_PHRASE:
        raise RuntimeError(
            "Mutating demo data requires: "
            f"--confirm-target {CONFIRMATION_PHRASE}"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Manage the disposable browser demo dataset"
    )
    parser.add_argument(
        "action",
        choices=("status", "seed", "cleanup"),
    )
    parser.add_argument(
        "--confirm-target",
        help="Required confirmation phrase for seed and cleanup",
    )
    arguments = parser.parse_args()

    target = verify_database_target()
    print_target(target)
    db = SessionLocal()

    try:
        if arguments.action == "status":
            status = demo_status(db)
            print("Demo records:")
            for name, count in status.items():
                print(f"  {name}: {count}")
            return

        require_confirmation(arguments)

        if arguments.action == "seed":
            created, updated = seed_demo_data(db)
            print("Demo dataset ready.")
            print("Created: " + (", ".join(created) if created else "none"))
            print("Updated: " + (", ".join(updated) if updated else "none"))
            print(f"Admin username: {DEMO_ADMIN_USERNAME}")
            print(f"Student username: {DEMO_STUDENT_USERNAME}")
            print("Password source: BROWSER_DEMO_PASSWORD environment variable")
            print("No application was seeded; use the browser Apply flow.")
            return

        removed = cleanup_demo_data(db)
        print("Demo cleanup complete:")
        for name, count in removed.items():
            print(f"  removed {name}: {count}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
