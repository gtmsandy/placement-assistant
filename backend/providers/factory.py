import os

from providers.base import OtpDeliveryProvider
from providers.email import ResendEmailProvider
from providers.fake import FakeOtpProvider


class ProviderConfigurationError(RuntimeError):
    pass


def create_otp_provider() -> OtpDeliveryProvider:
    provider_name = os.getenv("EMAIL_PROVIDER", "").strip().lower()

    if provider_name == "fake":
        return FakeOtpProvider()

    if provider_name == "resend":
        api_key = os.getenv("RESEND_API_KEY", "").strip()
        from_address = os.getenv("EMAIL_FROM_ADDRESS", "").strip()
        from_name = os.getenv("EMAIL_FROM_NAME", "Placement Assistant").strip()

        if not api_key or not from_address:
            raise ProviderConfigurationError(
                "Resend email delivery is not fully configured."
            )

        return ResendEmailProvider(
            api_key=api_key,
            from_address=from_address,
            from_name=from_name or "Placement Assistant",
        )

    if not provider_name:
        raise ProviderConfigurationError(
            "EMAIL_PROVIDER must be configured for password recovery."
        )

    raise ProviderConfigurationError(
        "Unsupported email provider configuration."
    )
