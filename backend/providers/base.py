from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class DeliveryResult:
    accepted: bool


class OtpDeliveryProvider(Protocol):
    def send_otp(
        self,
        *,
        destination: str,
        code: str,
        purpose: str,
        expires_in_seconds: int,
        idempotency_key: str,
    ) -> DeliveryResult:
        ...
