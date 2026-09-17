from dataclasses import dataclass

from providers.base import DeliveryResult


@dataclass(frozen=True)
class FakeDelivery:
    destination: str
    code: str
    purpose: str
    expires_in_seconds: int
    idempotency_key: str


class FakeOtpProvider:
    def __init__(
        self,
        *,
        accepted: bool = True,
        exception: Exception | None = None,
    ):
        self.accepted = accepted
        self.exception = exception
        self.deliveries: list[FakeDelivery] = []

    def send_otp(
        self,
        *,
        destination: str,
        code: str,
        purpose: str,
        expires_in_seconds: int,
        idempotency_key: str,
    ) -> DeliveryResult:
        if self.exception is not None:
            raise self.exception

        self.deliveries.append(
            FakeDelivery(
                destination=destination,
                code=code,
                purpose=purpose,
                expires_in_seconds=expires_in_seconds,
                idempotency_key=idempotency_key,
            )
        )

        return DeliveryResult(
            accepted=self.accepted
        )
