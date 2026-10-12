import os
from pathlib import Path


BACKEND_DIRECTORY = Path(__file__).resolve().parent


def blob_storage_enabled() -> bool:
    return bool(
        os.getenv(
            "BLOB_SIGNER_INTERNAL_URL",
            "",
        ).strip()
    )


def get_upload_root() -> Path:
    configured = os.getenv("UPLOAD_ROOT", "").strip()
    environment = os.getenv("APP_ENV", "production").strip().lower()

    if (
        environment != "development"
        and not configured
        and not blob_storage_enabled()
    ):
        raise RuntimeError("UPLOAD_ROOT must be configured in production.")

    if configured:
        configured_path = Path(configured)
        if environment != "development" and not configured_path.is_absolute():
            raise RuntimeError("UPLOAD_ROOT must be an absolute path in production.")
        return configured_path.resolve()

    return (BACKEND_DIRECTORY / "uploads").resolve()


UPLOAD_ROOT = get_upload_root()
RESUME_DIRECTORY = UPLOAD_ROOT / "resumes"
JD_DIRECTORY = UPLOAD_ROOT / "jd"
