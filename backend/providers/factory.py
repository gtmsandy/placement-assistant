import os

from providers.base import OtpDeliveryProvider
from providers.email import ResendEmailProvider
from providers.fake import FakeOtpProvider
from providers.gmail_smtp import GmailSmtpEmailProvider


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
        app_env = os.getenv("APP_ENV", "production")
        test_recipient = os.getenv("EMAIL_TEST_RECIPIENT")

        if not api_key or not from_address:
            raise ProviderConfigurationError(
                "Resend email delivery is not fully configured."
            )

        return ResendEmailProvider(
            api_key=api_key,
            from_address=from_address,
            from_name=from_name or "Placement Assistant",
            app_env=app_env,
            test_recipient=test_recipient,
        )

    if provider_name == "gmail_smtp":
        app_env = os.getenv("APP_ENV", "production").strip().lower()
        if app_env != "development":
            raise ProviderConfigurationError(
                "Gmail SMTP is available only in development."
            )

        host = os.getenv("SMTP_HOST", "").strip()
        port_value = os.getenv("SMTP_PORT", "").strip()
        username = os.getenv("SMTP_USERNAME", "").strip()
        app_password = os.getenv("SMTP_APP_PASSWORD", "").strip()
        from_address = os.getenv("EMAIL_FROM_ADDRESS", "").strip()
        from_name = os.getenv("EMAIL_FROM_NAME", "Placement Assistant").strip()

        if not all(
            (
                host,
                port_value,
                username,
                app_password,
                from_address,
            )
        ):
            raise ProviderConfigurationError(
                "Gmail SMTP email delivery is not fully configured."
            )
        try:
            port = int(port_value)
            return GmailSmtpEmailProvider(
                host=host,
                port=port,
                username=username,
                app_password=app_password,
                from_address=from_address,
                from_name=from_name or "Placement Assistant",
            )
        except (TypeError, ValueError) as error:
            raise ProviderConfigurationError(
                "Gmail SMTP configuration is invalid."
            ) from error

    if not provider_name:
        raise ProviderConfigurationError(
            "EMAIL_PROVIDER must be configured for password recovery."
        )

    raise ProviderConfigurationError(
        "Unsupported email provider configuration."
    )
