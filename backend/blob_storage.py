from dataclasses import dataclass
from urllib.error import URLError
from urllib.parse import urlsplit

from blob_signer_client import (
    HttpResponseTooLargeError,
    default_http_transport,
    sign_blob_operation,
)


UPLOAD_URL_SECONDS = 300
DOWNLOAD_URL_SECONDS = 120
HEAD_URL_SECONDS = 60
DELETE_URL_SECONDS = 60

MAXIMUM_EXPIRY = {
    "put": 900,
    "get": 300,
    "head": 300,
    "delete": 120,
}

BLOB_TIMEOUT_SECONDS = 5
SMALL_RESPONSE_LIMIT = 4 * 1024


class BlobStorageError(RuntimeError):
    pass


class BlobStorageRequestError(BlobStorageError):
    pass


class BlobStorageResponseError(BlobStorageError):
    pass


@dataclass(frozen=True)
class BlobMetadata:
    content_length: int | None
    content_type: str | None
    etag: str | None


def _expiry(operation, value):
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or value <= 0
        or value > MAXIMUM_EXPIRY[operation]
    ):
        raise ValueError("Blob URL lifetime is outside the allowed range.")
    return value


def _create_url(*, kind, operation, pathname, valid_for_seconds, signer):
    signed = signer(
        kind=kind,
        operation=operation,
        pathname=pathname,
        valid_for_seconds=_expiry(operation, valid_for_seconds),
    )
    return signed.presigned_url


def create_blob_upload_url(
    *, kind, pathname, valid_for_seconds=UPLOAD_URL_SECONDS,
    signer=sign_blob_operation,
):
    return _create_url(
        kind=kind,
        operation="put",
        pathname=pathname,
        valid_for_seconds=valid_for_seconds,
        signer=signer,
    )


def create_blob_download_url(
    *, kind, pathname, valid_for_seconds=DOWNLOAD_URL_SECONDS,
    signer=sign_blob_operation,
):
    return _create_url(
        kind=kind,
        operation="get",
        pathname=pathname,
        valid_for_seconds=valid_for_seconds,
        signer=signer,
    )


def create_blob_head_url(
    *, kind, pathname, valid_for_seconds=HEAD_URL_SECONDS,
    signer=sign_blob_operation,
):
    return _create_url(
        kind=kind,
        operation="head",
        pathname=pathname,
        valid_for_seconds=valid_for_seconds,
        signer=signer,
    )


def create_blob_delete_url(
    *, kind, pathname, valid_for_seconds=DELETE_URL_SECONDS,
    signer=sign_blob_operation,
):
    return _create_url(
        kind=kind,
        operation="delete",
        pathname=pathname,
        valid_for_seconds=valid_for_seconds,
        signer=signer,
    )


def _validate_signed_url(url):
    try:
        parsed = urlsplit(url)
        parsed.port
    except (TypeError, ValueError) as exc:
        raise BlobStorageResponseError(
            "Blob service returned an invalid signed URL."
        ) from None
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.fragment
    ):
        raise BlobStorageResponseError(
            "Blob service returned an invalid signed URL."
        )


def _header(headers, name):
    lowered_name = name.lower()
    for key, value in headers.items():
        if key.lower() == lowered_name:
            return value
    return None


def _request_blob(
    *, method, signed_url, response_limit, transport,
    enforce_content_length=True,
):
    _validate_signed_url(signed_url)
    try:
        return transport(
            method=method,
            url=signed_url,
            headers={},
            body=None,
            timeout=BLOB_TIMEOUT_SECONDS,
            response_limit=response_limit,
            enforce_content_length=enforce_content_length,
        )
    except HttpResponseTooLargeError as exc:
        raise BlobStorageResponseError(
            "Private Blob exceeds the allowed size."
        ) from None
    except (TimeoutError, URLError, OSError) as exc:
        raise BlobStorageRequestError(
            "Private Blob request failed."
        ) from None


def read_private_blob(
    *, kind, pathname, maximum_bytes,
    signer=sign_blob_operation,
    transport=default_http_transport,
):
    if (
        isinstance(maximum_bytes, bool)
        or not isinstance(maximum_bytes, int)
        or maximum_bytes <= 0
    ):
        raise ValueError("Maximum Blob size must be a positive integer.")

    signed_url = create_blob_download_url(
        kind=kind,
        pathname=pathname,
        signer=signer,
    )
    response = _request_blob(
        method="GET",
        signed_url=signed_url,
        response_limit=maximum_bytes,
        transport=transport,
    )
    if response.status != 200:
        raise BlobStorageRequestError("Private Blob request was rejected.")

    content_length = _header(response.headers, "content-length")
    if content_length:
        try:
            if int(content_length) > maximum_bytes:
                raise BlobStorageResponseError(
                    "Private Blob exceeds the allowed size."
                )
        except ValueError:
            pass
    if len(response.body) > maximum_bytes:
        raise BlobStorageResponseError(
            "Private Blob exceeds the allowed size."
        )
    return response.body


def delete_private_blob(
    *, kind, pathname,
    signer=sign_blob_operation,
    transport=default_http_transport,
):
    signed_url = create_blob_delete_url(
        kind=kind,
        pathname=pathname,
        signer=signer,
    )
    response = _request_blob(
        method="DELETE",
        signed_url=signed_url,
        response_limit=SMALL_RESPONSE_LIMIT,
        transport=transport,
    )
    if not 200 <= response.status < 300:
        raise BlobStorageRequestError("Private Blob deletion was rejected.")


def head_private_blob(
    *, kind, pathname,
    signer=sign_blob_operation,
    transport=default_http_transport,
):
    signed_url = create_blob_head_url(
        kind=kind,
        pathname=pathname,
        signer=signer,
    )
    response = _request_blob(
        method="HEAD",
        signed_url=signed_url,
        response_limit=SMALL_RESPONSE_LIMIT,
        transport=transport,
        enforce_content_length=False,
    )
    if response.status != 200:
        raise BlobStorageRequestError("Private Blob metadata request was rejected.")

    raw_length = _header(response.headers, "content-length")
    try:
        content_length = int(raw_length) if raw_length is not None else None
    except ValueError:
        content_length = None
    return BlobMetadata(
        content_length=content_length,
        content_type=_header(response.headers, "content-type"),
        etag=_header(response.headers, "etag"),
    )
