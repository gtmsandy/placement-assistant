import re
from dataclasses import dataclass
from typing import Literal


IdentifierKind = Literal["email", "mobile", "username"]

NITR_EMAIL_DOMAIN = "@nitrkl.ac.in"

_EMAIL_PATTERN = re.compile(
    r"^[^\s@]+@[^\s@]+$"
)
_INDIAN_MOBILE_PATTERN = re.compile(
    r"^[6-9][0-9]{9}$"
)
_MOBILE_INPUT_PATTERN = re.compile(
    r"^[+0-9\s-]+$"
)
_USERNAME_PATTERN = re.compile(
    r"^[a-z0-9._-]{1,100}$"
)


class InvalidIdentifier(ValueError):
    """Raised when a login identifier is malformed or unsupported."""


@dataclass(frozen=True)
class NormalizedIdentifier:
    kind: IdentifierKind
    value: str


def normalize_indian_mobile(value: str) -> str:
    compact = re.sub(
        r"[\s-]",
        "",
        value.strip(),
    )

    if compact.startswith("+91"):
        compact = compact[3:]

    if not _INDIAN_MOBILE_PATTERN.fullmatch(
        compact
    ):
        raise InvalidIdentifier(
            "Invalid Indian mobile number"
        )

    return compact


def normalize_optional_mobile(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    if not value.strip():
        return None

    return normalize_indian_mobile(value)


def normalize_identifier(
    value: str,
    *,
    role: str | None = None,
) -> NormalizedIdentifier:
    normalized = value.strip().lower()

    if not normalized:
        raise InvalidIdentifier(
            "Identifier is required"
        )

    if "@" in normalized:
        if not _EMAIL_PATTERN.fullmatch(
            normalized
        ):
            raise InvalidIdentifier(
                "Invalid email address"
            )

        if (
            role == "student"
            and not normalized.endswith(
                NITR_EMAIL_DOMAIN
            )
        ):
            raise InvalidIdentifier(
                "Student email must use the NITR domain"
            )

        return NormalizedIdentifier(
            kind="email",
            value=normalized,
        )

    if _MOBILE_INPUT_PATTERN.fullmatch(
        normalized
    ):
        return NormalizedIdentifier(
            kind="mobile",
            value=normalize_indian_mobile(
                normalized
            ),
        )

    if not _USERNAME_PATTERN.fullmatch(
        normalized
    ):
        raise InvalidIdentifier(
            "Invalid username"
        )

    return NormalizedIdentifier(
        kind="username",
        value=normalized,
    )
