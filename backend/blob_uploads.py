import re
import uuid

from fastapi import HTTPException


KIND_PREFIXES = {
    "resume": "resumes",
    "jd": "job-descriptions",
    "excel": "result-imports",
}
GENERATED_NAME = re.compile(r"^[0-9a-f]{32}(\.[a-z0-9]+)$")


def generate_blob_pathname(*, kind, owner_id, extension):
    prefix = KIND_PREFIXES.get(kind)
    if not prefix or not isinstance(owner_id, int) or owner_id <= 0:
        raise ValueError("Invalid Blob namespace.")
    if not isinstance(extension, str) or not extension.startswith("."):
        raise ValueError("Invalid Blob extension.")

    return f"{prefix}/{owner_id}/{uuid.uuid4().hex}{extension.lower()}"


def validate_blob_pathname(
    *, kind, owner_id, pathname, allowed_extensions,
):
    prefix = KIND_PREFIXES.get(kind)
    expected_prefix = f"{prefix}/{owner_id}/" if prefix else ""

    if (
        not expected_prefix
        or not isinstance(pathname, str)
        or not pathname.startswith(expected_prefix)
        or pathname.count("/") != 2
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid uploaded file reference.",
        )

    filename = pathname[len(expected_prefix):]
    match = GENERATED_NAME.fullmatch(filename)
    extension = match.group(1) if match else None
    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Invalid uploaded file reference.",
        )

    return extension
