import os
import uuid
import zipfile
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException


MEBIBYTE = 1024 * 1024

MAX_RESUME_SIZE = 5 * MEBIBYTE
MAX_JD_SIZE = 10 * MEBIBYTE
MAX_EXCEL_SIZE = 5 * MEBIBYTE

UPLOAD_CHUNK_SIZE = 1024 * 1024

RESUME_MIME_TYPES = {
    ".pdf": {"application/pdf"},
    ".doc": {
        "application/msword",
        "application/vnd.ms-word",
        "application/x-ole-storage",
    },
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
}

JD_MIME_TYPES = {
    ".pdf": {"application/pdf"},
}

EXCEL_MIME_TYPES = {
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    ".xlsm": {
        "application/vnd.ms-excel.sheet.macroenabled.12",
        "application/vnd.ms-excel.sheet.macroEnabled.12",
    },
}

PDF_SIGNATURE = b"%PDF"
OLE_SIGNATURE = bytes.fromhex(
    "D0CF11E0A1B11AE1"
)
ZIP_SIGNATURES = (
    b"PK\x03\x04",
    b"PK\x05\x06",
    b"PK\x07\x08",
)


def normalized_extension(filename):
    return os.path.splitext(
        filename or ""
    )[1].lower()


def validate_extension_and_mime(
    file,
    allowed_mime_types,
    invalid_type_message,
):
    extension = normalized_extension(
        file.filename
    )

    if extension not in allowed_mime_types:
        raise HTTPException(
            status_code=400,
            detail=invalid_type_message,
        )

    declared_mime = (
        file.content_type or ""
    ).split(";", 1)[0].strip().lower()

    expected_mime_types = {
        value.lower()
        for value in allowed_mime_types[
            extension
        ]
    }

    if (
        declared_mime
        and declared_mime
        not in expected_mime_types
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Uploaded file type does not "
                "match its extension."
            ),
        )

    return extension


def generate_safe_upload_path(
    directory,
    extension,
):
    base_directory = Path(
        directory
    ).resolve()
    base_directory.mkdir(
        parents=True,
        exist_ok=True,
    )

    destination = (
        base_directory
        / f"{uuid.uuid4().hex}{extension}"
    ).resolve()

    if destination.parent != base_directory:
        raise RuntimeError(
            "Generated upload path escaped its directory"
        )

    return destination


def stored_upload_path(
    directory,
    stored_url,
    expected_url_prefix=None,
):
    if not stored_url:
        return None

    normalized_url = str(
        stored_url
    ).replace("\\", "/")

    if expected_url_prefix:
        normalized_prefix = (
            expected_url_prefix.rstrip("/")
            + "/"
        )

        if not normalized_url.startswith(
            normalized_prefix
        ):
            return None

        stored_filename = normalized_url[
            len(normalized_prefix):
        ]
    else:
        stored_filename = Path(
            normalized_url
        ).name

    if (
        not stored_filename
        or "/" in stored_filename
        or stored_filename
        in {".", ".."}
    ):
        return None

    base_directory = Path(
        directory
    ).resolve()

    candidate = (
        base_directory / stored_filename
    ).resolve()

    if candidate.parent != base_directory:
        return None

    return candidate


async def write_upload_with_limit(
    file,
    destination,
    maximum_size,
):
    total_size = 0

    with destination.open("wb") as buffer:
        while True:
            chunk = await file.read(
                UPLOAD_CHUNK_SIZE
            )

            if not chunk:
                break

            total_size += len(chunk)

            if total_size > maximum_size:
                raise HTTPException(
                    status_code=413,
                    detail=(
                        "Uploaded file exceeds the "
                        "maximum allowed size."
                    ),
                )

            buffer.write(chunk)

    return total_size


async def read_upload_with_limit(
    file,
    maximum_size,
):
    contents = bytearray()

    while True:
        chunk = await file.read(
            min(
                UPLOAD_CHUNK_SIZE,
                maximum_size
                - len(contents)
                + 1,
            )
        )

        if not chunk:
            break

        contents.extend(chunk)

        if len(contents) > maximum_size:
            raise HTTPException(
                status_code=413,
                detail=(
                    "Uploaded file exceeds the "
                    "maximum allowed size."
                ),
            )

    return bytes(contents)


def _is_valid_office_zip(
    source,
    required_member,
):
    try:
        with zipfile.ZipFile(source) as archive:
            names = set(archive.namelist())
    except (
        OSError,
        zipfile.BadZipFile,
        zipfile.LargeZipFile,
    ):
        return False

    return (
        "[Content_Types].xml" in names
        and required_member in names
    )


def validate_resume_content(
    path,
    extension,
):
    with path.open("rb") as source:
        signature = source.read(8)

    valid = False

    if extension == ".pdf":
        valid = signature.startswith(
            PDF_SIGNATURE
        )
    elif extension == ".doc":
        valid = signature.startswith(
            OLE_SIGNATURE
        )
    elif extension == ".docx":
        valid = (
            signature.startswith(
                ZIP_SIGNATURES
            )
            and _is_valid_office_zip(
                path,
                "word/document.xml",
            )
        )

    if not valid:
        raise HTTPException(
            status_code=400,
            detail=(
                "Resume content does not match "
                "the selected file type."
            ),
        )


def validate_pdf_content(path):
    with path.open("rb") as source:
        signature = source.read(4)

    if not signature.startswith(
        PDF_SIGNATURE
    ):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not a valid PDF.",
        )


def validate_excel_content(contents):
    if (
        not contents.startswith(
            ZIP_SIGNATURES
        )
        or not _is_valid_office_zip(
            BytesIO(contents),
            "xl/workbook.xml",
        )
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Uploaded file is not a valid "
                "Excel workbook."
            ),
        )
