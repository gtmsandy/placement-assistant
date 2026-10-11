import json
import logging
import os
import smtplib
import sys
import unittest
from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from providers.email import EmailDeliveryError, ResendEmailProvider  # noqa: E402
from providers.factory import ProviderConfigurationError, create_otp_provider  # noqa: E402
from providers.fake import FakeOtpProvider  # noqa: E402
from providers.gmail_smtp import GmailSmtpEmailProvider  # noqa: E402


class FakeHttpResponse:
    status = 202

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class ResendEmailProviderTests(unittest.TestCase):
    def provider(self, **overrides):
        values = {
            "api_key": "test-resend-key",
            "from_address": "no-reply@example.com",
            "from_name": "Placement Assistant",
            "timeout_seconds": 7,
        }
        values.update(overrides)
        return ResendEmailProvider(**values)

    @patch("providers.email.urlopen")
    def test_resend_request_is_constructed_correctly(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeHttpResponse()
        result = self.provider().send_otp(
            destination="student@nitrkl.ac.in",
            code="123456",
            purpose="password_recovery",
            expires_in_seconds=600,
            idempotency_key="challenge-id",
        )

        request = mocked_urlopen.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertTrue(result.accepted)
        self.assertEqual(request.full_url, "https://api.resend.com/emails")
        self.assertEqual(request.method, "POST")
        self.assertEqual(mocked_urlopen.call_args.kwargs["timeout"], 7)
        self.assertEqual(request.get_header("Authorization"), "Bearer test-resend-key")
        self.assertEqual(request.get_header("Idempotency-key"), "challenge-id")
        self.assertEqual(payload["to"], ["student@nitrkl.ac.in"])
        self.assertEqual(payload["subject"], "Placement Assistant - Password Reset Code")
        self.assertIn("123456", payload["text"])
        self.assertIn("10 minutes", payload["text"])
        self.assertNotIn("reset_token", json.dumps(payload))

    @patch("providers.email.urlopen")
    def test_development_without_override_uses_original_recipient(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeHttpResponse()
        self.provider(app_env="development").send_otp(
            destination="student@nitrkl.ac.in",
            code="123456",
            purpose="password_recovery",
            expires_in_seconds=600,
            idempotency_key="challenge-id",
        )

        request = mocked_urlopen.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(payload["to"], ["student@nitrkl.ac.in"])

    @patch("providers.email.urlopen")
    def test_registration_email_uses_registration_copy(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeHttpResponse()
        self.provider().send_otp(
            destination="student@nitrkl.ac.in",
            code="123456",
            purpose="student_registration",
            expires_in_seconds=600,
            idempotency_key="registration-challenge",
        )

        request = mocked_urlopen.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(
            payload["subject"],
            "Placement Assistant - Verify Your College Email",
        )
        self.assertIn("registration", payload["text"].lower())
        self.assertNotIn("password reset", payload["text"].lower())

    @patch("providers.email.urlopen")
    def test_production_ignores_test_recipient(self, mocked_urlopen):
        mocked_urlopen.return_value = FakeHttpResponse()
        with self.assertLogs("providers.email", level="WARNING") as captured:
            provider = self.provider(
                app_env="production",
                test_recipient="delivery-override@gmail.com",
            )
        provider.send_otp(
            destination="student@nitrkl.ac.in",
            code="123456",
            purpose="password_recovery",
            expires_in_seconds=600,
            idempotency_key="challenge-id",
        )

        request = mocked_urlopen.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(payload["to"], ["student@nitrkl.ac.in"])
        self.assertNotIn("delivery-override", " ".join(captured.output))

    @patch("providers.email.urlopen", side_effect=TimeoutError("network timeout detail"))
    def test_timeout_is_sanitized(self, _mocked_urlopen):
        with self.assertRaisesRegex(EmailDeliveryError, "Email delivery request failed") as captured:
            self.provider().send_otp(
                destination="student@nitrkl.ac.in",
                code="123456",
                purpose="password_recovery",
                expires_in_seconds=600,
                idempotency_key="challenge-id",
            )
        self.assertNotIn("network timeout detail", str(captured.exception))
        self.assertNotIn("test-resend-key", str(captured.exception))

    def test_fake_provider_mode_is_explicit(self):
        with patch.dict(os.environ, {"EMAIL_PROVIDER": "fake"}, clear=False):
            self.assertIsInstance(create_otp_provider(), FakeOtpProvider)

    def test_resend_provider_mode_uses_environment(self):
        values = {
            "EMAIL_PROVIDER": "resend",
            "RESEND_API_KEY": "environment-test-key",
            "EMAIL_FROM_ADDRESS": "no-reply@example.com",
            "EMAIL_FROM_NAME": "Placement Assistant",
            "APP_ENV": "development",
            "EMAIL_TEST_RECIPIENT": "delivery-override@gmail.com",
        }
        with patch.dict(os.environ, values, clear=False):
            provider = create_otp_provider()
        self.assertIsInstance(provider, ResendEmailProvider)
        self.assertEqual(provider.from_address, "no-reply@example.com")
        self.assertEqual(provider.test_recipient, "delivery-override@gmail.com")

    def test_unsupported_provider_fails_closed(self):
        with patch.dict(os.environ, {"EMAIL_PROVIDER": "unsupported"}, clear=False):
            with self.assertRaises(ProviderConfigurationError):
                create_otp_provider()

    def test_missing_provider_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ProviderConfigurationError):
                create_otp_provider()

    def test_incomplete_resend_configuration_fails_closed(self):
        with patch.dict(
            os.environ,
            {"EMAIL_PROVIDER": "resend", "RESEND_API_KEY": "", "EMAIL_FROM_ADDRESS": ""},
            clear=True,
        ):
            with self.assertRaises(ProviderConfigurationError):
                create_otp_provider()


class GmailSmtpEmailProviderTests(unittest.TestCase):
    def provider(self, **overrides):
        values = {
            "host": "smtp.gmail.com",
            "port": 587,
            "username": "smtp-user@example.com",
            "app_password": "test-app-password",
            "from_address": "smtp-user@example.com",
            "from_name": "Placement Assistant",
            "timeout_seconds": 8,
        }
        values.update(overrides)
        return GmailSmtpEmailProvider(**values)

    def configured_environment(self, **overrides):
        values = {
            "APP_ENV": "development",
            "EMAIL_PROVIDER": "gmail_smtp",
            "SMTP_HOST": "smtp.gmail.com",
            "SMTP_PORT": "587",
            "SMTP_USERNAME": "smtp-user@example.com",
            "SMTP_APP_PASSWORD": "test-app-password",
            "EMAIL_FROM_ADDRESS": "smtp-user@example.com",
            "EMAIL_FROM_NAME": "Placement Assistant",
        }
        values.update(overrides)
        return values

    def smtp_session(self, mocked_smtp):
        session = MagicMock()
        session.send_message.return_value = {}
        mocked_smtp.return_value.__enter__.return_value = session
        return session

    def send(self, provider=None):
        return (provider or self.provider()).send_otp(
            destination="student@nitrkl.ac.in",
            code="123456",
            purpose="student_registration",
            expires_in_seconds=600,
            idempotency_key="registration-challenge",
        )

    def test_gmail_smtp_is_selected_in_development(self):
        with patch.dict(
            os.environ,
            self.configured_environment(),
            clear=True,
        ):
            provider = create_otp_provider()

        self.assertIsInstance(provider, GmailSmtpEmailProvider)
        self.assertEqual(provider.host, "smtp.gmail.com")
        self.assertEqual(provider.port, 587)
        self.assertEqual(provider.username, "smtp-user@example.com")

    def test_gmail_smtp_is_rejected_outside_development(self):
        for app_env in ("production", "staging", ""):
            with self.subTest(app_env=app_env):
                with patch.dict(
                    os.environ,
                    self.configured_environment(APP_ENV=app_env),
                    clear=True,
                ):
                    with self.assertRaisesRegex(
                        ProviderConfigurationError,
                        "development",
                    ):
                        create_otp_provider()

    def test_incomplete_gmail_smtp_configuration_fails_closed(self):
        with patch.dict(
            os.environ,
            self.configured_environment(SMTP_APP_PASSWORD=""),
            clear=True,
        ):
            with self.assertRaises(ProviderConfigurationError):
                create_otp_provider()

    @patch("providers.gmail_smtp.smtplib.SMTP")
    def test_smtp_connection_uses_configured_host_port_and_timeout(
        self,
        mocked_smtp,
    ):
        self.smtp_session(mocked_smtp)
        self.send()

        mocked_smtp.assert_called_once_with(
            "smtp.gmail.com",
            587,
            timeout=8,
        )

    @patch("providers.gmail_smtp.smtplib.SMTP")
    def test_starttls_is_invoked_before_authentication(self, mocked_smtp):
        session = self.smtp_session(mocked_smtp)
        self.send()

        method_names = [
            call[0]
            for call in session.method_calls
        ]
        self.assertIn("starttls", method_names)
        self.assertLess(
            method_names.index("starttls"),
            method_names.index("login"),
        )
        self.assertIn(
            "context",
            session.starttls.call_args.kwargs,
        )

    @patch("providers.gmail_smtp.smtplib.SMTP")
    def test_smtp_authentication_uses_configured_credentials(self, mocked_smtp):
        session = self.smtp_session(mocked_smtp)
        self.send()

        session.login.assert_called_once_with(
            "smtp-user@example.com",
            "test-app-password",
        )

    @patch("providers.gmail_smtp.smtplib.SMTP")
    def test_message_uses_configured_sender_and_requested_recipient(
        self,
        mocked_smtp,
    ):
        session = self.smtp_session(mocked_smtp)
        result = self.send()

        message = session.send_message.call_args.args[0]
        self.assertTrue(result.accepted)
        self.assertEqual(
            message["From"],
            "Placement Assistant <smtp-user@example.com>",
        )
        self.assertEqual(message["To"], "student@nitrkl.ac.in")
        self.assertEqual(
            message["Subject"],
            "Placement Assistant - Verify Your College Email",
        )
        self.assertIn("123456", message.get_body(preferencelist=("plain",)).get_content())

    @patch(
        "providers.gmail_smtp.smtplib.SMTP",
        side_effect=TimeoutError("private timeout detail"),
    )
    def test_smtp_timeout_is_sanitized(self, _mocked_smtp):
        with self.assertRaisesRegex(
            EmailDeliveryError,
            "Email delivery request failed",
        ) as captured:
            self.send()

        self.assertNotIn("private timeout detail", str(captured.exception))
        self.assertNotIn("test-app-password", str(captured.exception))

    @patch("providers.gmail_smtp.smtplib.SMTP")
    def test_smtp_authentication_failure_is_sanitized(self, mocked_smtp):
        session = self.smtp_session(mocked_smtp)
        session.login.side_effect = smtplib.SMTPAuthenticationError(
            535,
            b"credential rejected",
        )

        with self.assertRaisesRegex(
            EmailDeliveryError,
            "Email delivery request failed",
        ) as captured:
            self.send()

        self.assertNotIn("credential rejected", str(captured.exception))
        self.assertNotIn("smtp-user@example.com", str(captured.exception))

    @patch("providers.gmail_smtp.smtplib.SMTP")
    def test_otp_and_smtp_secrets_are_not_logged(
        self,
        mocked_smtp,
    ):
        session = self.smtp_session(mocked_smtp)
        session.login.side_effect = smtplib.SMTPAuthenticationError(
            535,
            b"credential rejected",
        )

        stream = StringIO()
        handler = logging.StreamHandler(stream)
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        try:
            with self.assertRaises(EmailDeliveryError):
                self.send()
        finally:
            root_logger.removeHandler(handler)

        logged = stream.getvalue()
        self.assertNotIn("123456", logged)
        self.assertNotIn("test-app-password", logged)
        self.assertNotIn("smtp-user@example.com", logged)


if __name__ == "__main__":
    unittest.main()
