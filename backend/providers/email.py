import json
from html import escape
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from providers.base import DeliveryResult


RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails"
DEFAULT_TIMEOUT_SECONDS = 10.0


class EmailDeliveryError(RuntimeError):
    """A sanitized email-provider failure safe for internal control flow."""


class ResendEmailProvider:
    def __init__(
        self,
        *,
        api_key: str,
        from_address: str,
        from_name: str = "Placement Assistant",
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
    ):
        if not api_key or not api_key.strip():
            raise ValueError("Resend API key is required.")
        if not from_address or not from_address.strip():
            raise ValueError("Email sender address is required.")
        if "\r" in from_address or "\n" in from_address:
            raise ValueError("Email sender address is invalid.")
        if "\r" in from_name or "\n" in from_name:
            raise ValueError("Email sender name is invalid.")
        if timeout_seconds <= 0:
            raise ValueError("Email request timeout must be positive.")

        self.api_key = api_key.strip()
        self.from_address = from_address.strip()
        self.from_name = from_name.strip() or "Placement Assistant"
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
        expiry_minutes = max(1, expires_in_seconds // 60)
        subject = "Placement Assistant - Password Reset Code"
        text_body = (
            "Use the following one-time code to reset your Placement Assistant "
            f"password: {code}\n\n"
            f"This code expires in {expiry_minutes} minutes. "
            "If you did not request a password reset, ignore this email."
        )
        html_body = (
            "<p>Use the following one-time code to reset your Placement "
            "Assistant password:</p>"
            f"<p><strong style=\"font-size: 24px; letter-spacing: 4px\">"
            f"{escape(code)}</strong></p>"
            f"<p>This code expires in {expiry_minutes} minutes.</p>"
            "<p>If you did not request a password reset, ignore this email.</p>"
        )
        payload = {
            "from": f"{self.from_name} <{self.from_address}>",
            "to": [destination],
            "subject": subject,
            "text": text_body,
            "html": html_body,
        }
        request = Request(
            RESEND_EMAIL_ENDPOINT,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Idempotency-Key": idempotency_key,
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                status = getattr(response, "status", None)
                if status is None:
                    status = response.getcode()
                return DeliveryResult(accepted=200 <= status < 300)
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            raise EmailDeliveryError("Email delivery request failed.") from error
