import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from providers.base import DeliveryResult
from providers.email import EmailDeliveryError, build_otp_email_content


DEFAULT_TIMEOUT_SECONDS = 10.0
GMAIL_SMTP_HOST = "smtp.gmail.com"
GMAIL_SMTP_PORT = 587

class GmailSmtpEmailProvider:
    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str,
        app_password: str,
        from_address: str,
        from_name: str = "Placement Assistant",
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ):
        normalized_host = host.strip().lower()
        normalized_username = username.strip()
        normalized_from_address = from_address.strip()
        normalized_from_name = from_name.strip() or "Placement Assistant"

        if normalized_host != GMAIL_SMTP_HOST:
            raise ValueError("Gmail SMTP host is invalid.")
        if port != GMAIL_SMTP_PORT:
            raise ValueError("Gmail SMTP port must be 587.")
        normalized_app_password = app_password.strip()
        if not normalized_username or not normalized_app_password:
            raise ValueError("Gmail SMTP credentials are required.")
        if not normalized_from_address:
            raise ValueError("Email sender address is required.")
        if timeout_seconds <= 0:
            raise ValueError("SMTP timeout must be positive.")
        for value in (
            normalized_username,
            normalized_from_address,
            normalized_from_name,
        ):
            if "\r" in value or "\n" in value:
                raise ValueError("SMTP email configuration is invalid.")

        self.host = normalized_host
        self.port = port
        self.username = normalized_username
        self.app_password = normalized_app_password
        self.from_address = normalized_from_address
        self.from_name = normalized_from_name
        self.timeout_seconds = timeout_seconds

    def send_otp(
        self,
        *,
        destination: str,
        code: str,
        purpose: str,
        expires_in_seconds: int,
        idempotency_key: str,
    ) -> DeliveryResult:
        del idempotency_key
        content = build_otp_email_content(
            code=code,
            purpose=purpose,
            expires_in_seconds=expires_in_seconds,
        )
        message = EmailMessage()
        message["From"] = formataddr(
            (self.from_name, self.from_address)
        )
        message["To"] = destination
        message["Subject"] = content.subject
        message.set_content(content.text_body)
        message.add_alternative(
            content.html_body,
            subtype="html",
        )

        try:
            with smtplib.SMTP(
                self.host,
                self.port,
                timeout=self.timeout_seconds,
            ) as server:
                server.ehlo()
                server.starttls(
                    context=ssl.create_default_context()
                )
                server.ehlo()
                server.login(
                    self.username,
                    self.app_password,
                )
                refused = server.send_message(message)
            return DeliveryResult(
                accepted=not refused
            )
        except (
            smtplib.SMTPException,
            TimeoutError,
            OSError,
        ) as error:
            raise EmailDeliveryError(
                "Email delivery request failed."
            ) from error
