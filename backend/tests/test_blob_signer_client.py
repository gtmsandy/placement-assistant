import json
import logging
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from blob_signer_client import (  # noqa: E402
    BlobSignerConfigurationError,
    BlobSignerRequestError,
    BlobSignerResponseError,
    HttpResponse,
    sign_blob_operation,
)
from blob_storage import (  # noqa: E402
    BlobStorageRequestError,
    BlobStorageResponseError,
    create_blob_download_url,
    create_blob_head_url,
    create_blob_upload_url,
    delete_private_blob,
    head_private_blob,
    read_private_blob,
)


SIGNER_URL = "https://blob-signer.internal"
SIGNED_URL = "https://example.public.blob.vercel-storage.com/resumes/test.pdf?sig=test"


def valid_signer_body(pathname="resumes/test.pdf", operation="get"):
    return json.dumps({
        "presignedUrl": SIGNED_URL,
        "pathname": pathname,
        "operation": operation,
        "expiresAt": "2026-10-12T12:00:00Z",
    }).encode("utf-8")


class RecordingTransport:
    def __init__(self, response=None, error=None):
        self.response = response or HttpResponse(
            status=200,
            headers={"content-type": "application/json"},
            body=valid_signer_body(),
        )
        self.error = error
        self.calls = []

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        if self.error:
            raise self.error
        return self.response


class BlobSignerClientTests(unittest.TestCase):
    def invoke(self, transport, **overrides):
        arguments = {
            "kind": "resume",
            "operation": "get",
            "pathname": "resumes/test.pdf",
            "valid_for_seconds": 60,
            "transport": transport,
        }
        arguments.update(overrides)
        return sign_blob_operation(**arguments)

    def test_missing_configuration_fails_only_when_invoked(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(BlobSignerConfigurationError):
                self.invoke(RecordingTransport())

    def test_invalid_internal_urls_are_rejected(self):
        invalid_urls = (
            "ftp://signer.internal",
            "https://user:password@signer.internal",
            "https://signer.internal?debug=true",
            "https://signer.internal#fragment",
            "not-a-url",
        )
        for value in invalid_urls:
            with self.subTest(value=value):
                with patch.dict(
                    os.environ,
                    {"BLOB_SIGNER_INTERNAL_URL": value},
                    clear=True,
                ):
                    with self.assertRaises(BlobSignerConfigurationError):
                        self.invoke(RecordingTransport())

    def test_request_is_narrow_and_targets_fixed_sign_path(self):
        transport = RecordingTransport()
        with patch.dict(
            os.environ,
            {"BLOB_SIGNER_INTERNAL_URL": f"{SIGNER_URL}/"},
            clear=True,
        ):
            result = self.invoke(transport)

        self.assertEqual(result.presigned_url, SIGNED_URL)
        self.assertEqual(len(transport.calls), 1)
        call = transport.calls[0]
        self.assertEqual(call["method"], "POST")
        self.assertEqual(call["url"], f"{SIGNER_URL}/sign")
        self.assertEqual(call["headers"], {
            "Content-Type": "application/json",
        })
        self.assertEqual(json.loads(call["body"]), {
            "kind": "resume",
            "operation": "get",
            "pathname": "resumes/test.pdf",
            "validForSeconds": 60,
        })
        self.assertEqual(call["timeout"], 5)
        self.assertEqual(call["response_limit"], 16 * 1024)

    def test_unknown_kind_is_rejected_before_network(self):
        transport = RecordingTransport()
        with patch.dict(
            os.environ,
            {"BLOB_SIGNER_INTERNAL_URL": SIGNER_URL},
            clear=True,
        ):
            with self.assertRaises(ValueError):
                self.invoke(transport, kind="avatar")
        self.assertEqual(transport.calls, [])

    def test_unknown_operation_is_rejected_before_network(self):
        transport = RecordingTransport()
        with patch.dict(
            os.environ,
            {"BLOB_SIGNER_INTERNAL_URL": SIGNER_URL},
            clear=True,
        ):
            with self.assertRaises(ValueError):
                self.invoke(transport, operation="copy")
        self.assertEqual(transport.calls, [])

    def test_network_failure_is_sanitized(self):
        secret = "https://secret.invalid/path?token=do-not-leak"
        transport = RecordingTransport(error=TimeoutError(secret))
        with patch.dict(
            os.environ,
            {"BLOB_SIGNER_INTERNAL_URL": SIGNER_URL},
            clear=True,
        ):
            with self.assertRaises(BlobSignerRequestError) as raised:
                self.invoke(transport)
        self.assertNotIn(secret, str(raised.exception))
        self.assertIsNone(raised.exception.__cause__)

    def test_non_success_status_is_sanitized(self):
        secret = "provider body with internal details"
        transport = RecordingTransport(response=HttpResponse(
            status=503,
            headers={},
            body=secret.encode("utf-8"),
        ))
        with patch.dict(
            os.environ,
            {"BLOB_SIGNER_INTERNAL_URL": SIGNER_URL},
            clear=True,
        ):
            with self.assertRaises(BlobSignerRequestError) as raised:
                self.invoke(transport)
        self.assertNotIn(secret, str(raised.exception))

    def test_malformed_json_is_rejected(self):
        raised = self.assert_response_rejected(b"not-json")
        self.assertIsNone(raised.exception.__cause__)

    def test_oversized_response_is_rejected(self):
        self.assert_response_rejected(b"x" * (16 * 1024 + 1))

    def test_mismatched_pathname_is_rejected(self):
        self.assert_response_rejected(valid_signer_body(
            pathname="resumes/other.pdf",
        ))

    def test_mismatched_operation_is_rejected(self):
        self.assert_response_rejected(valid_signer_body(
            operation="delete",
        ))

    def test_missing_presigned_url_is_rejected(self):
        payload = json.loads(valid_signer_body())
        del payload["presignedUrl"]
        self.assert_response_rejected(json.dumps(payload).encode("utf-8"))

    def test_malformed_expiry_is_rejected(self):
        payload = json.loads(valid_signer_body())
        payload["expiresAt"] = "not-a-timestamp"
        self.assert_response_rejected(json.dumps(payload).encode("utf-8"))

    def assert_response_rejected(self, body):
        transport = RecordingTransport(response=HttpResponse(
            status=200,
            headers={"content-type": "application/json"},
            body=body,
        ))
        with patch.dict(
            os.environ,
            {"BLOB_SIGNER_INTERNAL_URL": SIGNER_URL},
            clear=True,
        ):
            with self.assertRaises(BlobSignerResponseError) as raised:
                self.invoke(transport)
        return raised


class RecordingSigner:
    def __init__(self, presigned_url=SIGNED_URL):
        self.presigned_url = presigned_url
        self.calls = []

    def __call__(self, **kwargs):
        self.calls.append(kwargs)
        return type("SignedOperation", (), {
            "presigned_url": self.presigned_url,
        })()


class BlobStorageTests(unittest.TestCase):
    def test_upload_url_default_expiry_is_bounded(self):
        signer = RecordingSigner()
        result = create_blob_upload_url(
            kind="resume",
            pathname="resumes/test.pdf",
            signer=signer,
        )
        self.assertEqual(result, SIGNED_URL)
        self.assertEqual(signer.calls[0]["operation"], "put")
        self.assertLessEqual(signer.calls[0]["valid_for_seconds"], 900)

    def test_download_url_default_expiry_is_bounded(self):
        signer = RecordingSigner()
        create_blob_download_url(
            kind="resume",
            pathname="resumes/test.pdf",
            signer=signer,
        )
        self.assertEqual(signer.calls[0]["operation"], "get")
        self.assertLessEqual(signer.calls[0]["valid_for_seconds"], 300)

    def test_unbounded_expiry_is_rejected(self):
        signer = RecordingSigner()
        with self.assertRaises(ValueError):
            create_blob_upload_url(
                kind="resume",
                pathname="resumes/test.pdf",
                valid_for_seconds=901,
                signer=signer,
            )
        self.assertEqual(signer.calls, [])

    def test_bounded_blob_read_succeeds(self):
        signer = RecordingSigner()
        transport = RecordingTransport(response=HttpResponse(
            status=200,
            headers={"content-length": "4"},
            body=b"data",
        ))
        result = read_private_blob(
            kind="resume",
            pathname="resumes/test.pdf",
            maximum_bytes=4,
            signer=signer,
            transport=transport,
        )
        self.assertEqual(result, b"data")
        self.assertEqual(transport.calls[0]["method"], "GET")
        self.assertEqual(transport.calls[0]["headers"], {})

    def test_blob_read_rejects_excessive_content_length(self):
        transport = RecordingTransport(response=HttpResponse(
            status=200,
            headers={"Content-Length": "5"},
            body=b"data",
        ))
        with self.assertRaises(BlobStorageResponseError):
            read_private_blob(
                kind="resume",
                pathname="resumes/test.pdf",
                maximum_bytes=4,
                signer=RecordingSigner(),
                transport=transport,
            )

    def test_blob_read_rejects_actual_bytes_over_limit(self):
        transport = RecordingTransport(response=HttpResponse(
            status=200,
            headers={"content-length": "1"},
            body=b"12345",
        ))
        with self.assertRaises(BlobStorageResponseError):
            read_private_blob(
                kind="resume",
                pathname="resumes/test.pdf",
                maximum_bytes=4,
                signer=RecordingSigner(),
                transport=transport,
            )

    def test_blob_read_failure_does_not_expose_signed_url(self):
        secret_url = "https://blob.example/private.pdf?secret=signed-value"
        transport = RecordingTransport(error=TimeoutError(secret_url))
        with self.assertRaises(BlobStorageRequestError) as raised:
            read_private_blob(
                kind="resume",
                pathname="resumes/test.pdf",
                maximum_bytes=4,
                signer=RecordingSigner(secret_url),
                transport=transport,
            )
        self.assertNotIn(secret_url, str(raised.exception))
        self.assertIsNone(raised.exception.__cause__)

    def test_delete_uses_delete_and_sanitizes_failure(self):
        secret = "provider details must not escape"
        transport = RecordingTransport(response=HttpResponse(
            status=500,
            headers={},
            body=secret.encode("utf-8"),
        ))
        with self.assertRaises(BlobStorageRequestError) as raised:
            delete_private_blob(
                kind="resume",
                pathname="resumes/test.pdf",
                signer=RecordingSigner(),
                transport=transport,
            )
        self.assertEqual(transport.calls[0]["method"], "DELETE")
        self.assertNotIn(secret, str(raised.exception))

    def test_head_returns_only_safe_metadata(self):
        signer = RecordingSigner()
        transport = RecordingTransport(response=HttpResponse(
            status=200,
            headers={
                "Content-Length": "42",
                "Content-Type": "application/pdf",
                "ETag": '"safe-etag"',
                "Authorization": "must-not-return",
            },
            body=b"",
        ))
        metadata = head_private_blob(
            kind="resume",
            pathname="resumes/test.pdf",
            signer=signer,
            transport=transport,
        )
        self.assertEqual(metadata.content_length, 42)
        self.assertEqual(metadata.content_type, "application/pdf")
        self.assertEqual(metadata.etag, '"safe-etag"')
        self.assertFalse(hasattr(metadata, "authorization"))
        self.assertEqual(signer.calls[0]["operation"], "head")

    def test_url_helpers_and_reads_do_not_log_signed_urls(self):
        signer = RecordingSigner()
        transport = RecordingTransport(response=HttpResponse(
            status=200,
            headers={},
            body=b"data",
        ))
        with self.assertNoLogs(level=logging.DEBUG):
            create_blob_head_url(
                kind="resume",
                pathname="resumes/test.pdf",
                signer=signer,
            )
            read_private_blob(
                kind="resume",
                pathname="resumes/test.pdf",
                maximum_bytes=4,
                signer=signer,
                transport=transport,
            )


if __name__ == "__main__":
    unittest.main()
