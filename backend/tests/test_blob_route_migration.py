import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("APP_ENV", "development")

from blob_uploads import (  # noqa: E402
    generate_blob_pathname,
    validate_blob_pathname,
)
from storage_config import blob_storage_enabled  # noqa: E402
from upload_security import JD_MIME_TYPES  # noqa: E402
from upload_security import validate_filename_and_mime  # noqa: E402


class BlobUploadRouteFoundationTests(unittest.TestCase):
    def test_blob_storage_is_selected_only_when_binding_exists(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertFalse(blob_storage_enabled())

        with patch.dict(
            os.environ,
            {"BLOB_SIGNER_INTERNAL_URL": "http://blob-signer.internal"},
            clear=True,
        ):
            self.assertTrue(blob_storage_enabled())

    def test_generated_pathname_uses_expected_owner_namespace(self):
        pathname = generate_blob_pathname(
            kind="resume",
            owner_id=42,
            extension=".pdf",
        )

        self.assertTrue(pathname.startswith("resumes/42/"))
        self.assertTrue(pathname.endswith(".pdf"))
        self.assertEqual(
            validate_blob_pathname(
                kind="resume",
                owner_id=42,
                pathname=pathname,
                allowed_extensions={".pdf", ".doc", ".docx"},
            ),
            ".pdf",
        )

    def test_pathname_from_another_owner_is_rejected(self):
        pathname = generate_blob_pathname(
            kind="jd",
            owner_id=7,
            extension=".pdf",
        )

        with self.assertRaises(HTTPException) as raised:
            validate_blob_pathname(
                kind="jd",
                owner_id=8,
                pathname=pathname,
                allowed_extensions={".pdf"},
            )

        self.assertEqual(raised.exception.status_code, 400)

    def test_pathname_with_non_generated_name_is_rejected(self):
        with self.assertRaises(HTTPException):
            validate_blob_pathname(
                kind="excel",
                owner_id=5,
                pathname="result-imports/5/results.xlsx",
                allowed_extensions={".xlsx", ".xlsm"},
            )

    def test_metadata_validation_rejects_mime_mismatch(self):
        with self.assertRaises(HTTPException) as raised:
            validate_filename_and_mime(
                "description.pdf",
                "text/plain",
                JD_MIME_TYPES,
                "Only PDF files are allowed",
            )

        self.assertEqual(raised.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
