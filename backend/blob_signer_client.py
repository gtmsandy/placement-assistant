import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


SIGNER_TIMEOUT_SECONDS = 5
SIGNER_RESPONSE_LIMIT = 16 * 1024
VALID_KINDS = frozenset({"resume", "jd", "excel"})
VALID_OPERATIONS = frozenset({"put", "get", "head", "delete"})


class BlobSignerError(RuntimeError):
    pass


class BlobSignerConfigurationError(BlobSignerError):
    pass


class BlobSignerRequestError(BlobSignerError):
    pass


class BlobSignerResponseError(BlobSignerError):
    pass


class HttpResponseTooLargeError(Exception):
    pass


@dataclass(frozen=True)
class HttpResponse:
    status: int
    headers: Mapping[str, str]
    body: bytes


@dataclass(frozen=True)
class SignedBlobOperation:
    presigned_url: str
    pathname: str
    operation: str
    expires_at: datetime


HttpTransport = Callable[..., HttpResponse]


class _NoRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, url):
        return None


def _read_bounded(response, response_limit, enforce_content_length=True):
    content_length = response.headers.get("Content-Length")
    if content_length and enforce_content_length:
        try:
            if int(content_length) > response_limit:
                raise HttpResponseTooLargeError
        except ValueError:
            pass

    body = response.read(response_limit + 1)
    if len(body) > response_limit:
        raise HttpResponseTooLargeError
    return body


def default_http_transport(
    *,
    method,
    url,
    headers,
    body,
    timeout,
    response_limit,
    enforce_content_length=True,
):
    request = Request(
        url,
        data=body,
        headers=headers,
        method=method,
    )
    opener = build_opener(_NoRedirectHandler())

    try:
        with opener.open(request, timeout=timeout) as response:
            return HttpResponse(
                status=response.status,
                headers=dict(response.headers.items()),
                body=_read_bounded(
                    response,
                    response_limit,
                    enforce_content_length,
                ),
            )
    except HTTPError as exc:
        try:
            response_body = _read_bounded(exc, response_limit)
        except HttpResponseTooLargeError:
            response_body = b""
        return HttpResponse(
            status=exc.code,
            headers=dict(exc.headers.items()) if exc.headers else {},
            body=response_body,
        )


def _signer_endpoint():
    configured_url = os.getenv("BLOB_SIGNER_INTERNAL_URL", "").strip()
    if not configured_url:
        raise BlobSignerConfigurationError(
            "Blob signer service URL is not configured."
        )

    try:
        parsed = urlsplit(configured_url)
        parsed.port
    except ValueError as exc:
        raise BlobSignerConfigurationError(
            "Blob signer service URL is invalid."
        ) from None

    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
    ):
        raise BlobSignerConfigurationError(
            "Blob signer service URL is invalid."
        )

    return f"{configured_url.rstrip('/')}/sign"


def _validate_presigned_url(value):
    try:
        parsed = urlsplit(value)
        parsed.port
    except (TypeError, ValueError) as exc:
        raise BlobSignerResponseError(
            "Blob signer returned an invalid response."
        ) from None

    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
    ):
        raise BlobSignerResponseError(
            "Blob signer returned an invalid response."
        )


def _parse_expiry(value):
    if not isinstance(value, str) or not value.strip():
        raise BlobSignerResponseError(
            "Blob signer returned an invalid response."
        )
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise BlobSignerResponseError(
            "Blob signer returned an invalid response."
        ) from None
    if parsed.tzinfo is None:
        raise BlobSignerResponseError(
            "Blob signer returned an invalid response."
        )
    return parsed


def sign_blob_operation(
    *,
    kind,
    operation,
    pathname,
    valid_for_seconds,
    transport=None,
):
    if kind not in VALID_KINDS:
        raise ValueError("Unsupported Blob kind.")
    if operation not in VALID_OPERATIONS:
        raise ValueError("Unsupported Blob operation.")
    if not isinstance(pathname, str) or not pathname:
        raise ValueError("Blob pathname must be a non-empty string.")
    if (
        isinstance(valid_for_seconds, bool)
        or not isinstance(valid_for_seconds, int)
        or valid_for_seconds <= 0
    ):
        raise ValueError("Blob URL lifetime must be a positive integer.")

    payload = json.dumps({
        "kind": kind,
        "operation": operation,
        "pathname": pathname,
        "validForSeconds": valid_for_seconds,
    }).encode("utf-8")
    selected_transport = transport or default_http_transport

    try:
        response = selected_transport(
            method="POST",
            url=_signer_endpoint(),
            headers={"Content-Type": "application/json"},
            body=payload,
            timeout=SIGNER_TIMEOUT_SECONDS,
            response_limit=SIGNER_RESPONSE_LIMIT,
        )
    except HttpResponseTooLargeError as exc:
        raise BlobSignerResponseError(
            "Blob signer returned an oversized response."
        ) from None
    except (TimeoutError, URLError, OSError) as exc:
        raise BlobSignerRequestError(
            "Blob signer request failed."
        ) from None

    if len(response.body) > SIGNER_RESPONSE_LIMIT:
        raise BlobSignerResponseError(
            "Blob signer returned an oversized response."
        )
    if response.status != 200:
        raise BlobSignerRequestError(
            "Blob signer request was rejected."
        )

    try:
        decoded = json.loads(response.body)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BlobSignerResponseError(
            "Blob signer returned an invalid response."
        ) from None

    if not isinstance(decoded, dict):
        raise BlobSignerResponseError(
            "Blob signer returned an invalid response."
        )

    presigned_url = decoded.get("presignedUrl")
    if not isinstance(presigned_url, str) or not presigned_url.strip():
        raise BlobSignerResponseError(
            "Blob signer returned an invalid response."
        )
    if decoded.get("pathname") != pathname or decoded.get("operation") != operation:
        raise BlobSignerResponseError(
            "Blob signer returned an inconsistent response."
        )

    _validate_presigned_url(presigned_url)
    expires_at = _parse_expiry(decoded.get("expiresAt"))
    return SignedBlobOperation(
        presigned_url=presigned_url,
        pathname=pathname,
        operation=operation,
        expires_at=expires_at,
    )
