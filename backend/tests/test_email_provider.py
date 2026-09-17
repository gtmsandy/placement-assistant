import json
import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from providers.email import EmailDeliveryError, ResendEmailProvider  # noqa: E402
from providers.factory import ProviderConfigurationError, create_otp_provider  # noqa: E402
from providers.fake import FakeOtpProvider  # noqa: E402


class FakeHttpResponse:
    status = 202

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class ResendEmailProviderTests(unittest.TestCase):
    def provider(self):
        return ResendEmailProvider(
            api_key="test-resend-key",
            from_address="no-reply@example.com",
            from_name="Placement Assistant",
            timeout_seconds=7,
        )

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
        }
        with patch.dict(os.environ, values, clear=False):
            provider = create_otp_provider()
        self.assertIsInstance(provider, ResendEmailProvider)
        self.assertEqual(provider.from_address, "no-reply@example.com")

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


if __name__ == "__main__":
    unittest.main()
