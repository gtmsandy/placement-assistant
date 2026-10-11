import concurrent.futures
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

from fastapi import HTTPException

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("JWT_SECRET_KEY", "rate-limit-test-secret")

from login_rate_limiter import LoginRateLimiter, login_rate_limiter  # noqa: E402
from routers.auth import LoginRequest, login  # noqa: E402


class Clock:
    def __init__(self):
        self.value = 100.0

    def __call__(self):
        return self.value


class LoginRateLimiterTests(unittest.TestCase):
    def tearDown(self):
        login_rate_limiter.reset()

    def test_threshold_retry_after_expiry_and_success_clear(self):
        clock = Clock()
        limiter = LoginRateLimiter(limit=5, window_seconds=900, clock=clock)
        key = limiter.key("127.0.0.1", "student", "USER@NITRKL.AC.IN")
        for _ in range(5):
            self.assertEqual(limiter.retry_after(key), 0)
            limiter.record_failure(key)
        self.assertEqual(limiter.retry_after(key), 900)
        limiter.clear(key)
        self.assertEqual(limiter.retry_after(key), 0)
        limiter.record_failure(key)
        clock.value += 901
        self.assertEqual(limiter.retry_after(key), 0)

    def test_identifiers_clients_and_roles_have_separate_buckets(self):
        limiter = LoginRateLimiter(limit=1)
        locked = limiter.key("client-a", "student", "one@nitrkl.ac.in")
        limiter.record_failure(locked)
        self.assertGreater(limiter.retry_after(locked), 0)
        for key in (
            limiter.key("client-a", "student", "two@nitrkl.ac.in"),
            limiter.key("client-b", "student", "one@nitrkl.ac.in"),
            limiter.key("client-a", "admin", "one@nitrkl.ac.in"),
        ):
            self.assertEqual(limiter.retry_after(key), 0)

    def test_state_is_bounded_and_concurrent_failures_are_safe(self):
        limiter = LoginRateLimiter(limit=5, max_buckets=10)
        key = limiter.key("client", "student", "user@nitrkl.ac.in")
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
            list(pool.map(lambda _: limiter.record_failure(key), range(100)))
        self.assertGreater(limiter.retry_after(key), 0)
        for index in range(20):
            limiter.record_failure(limiter.key("client", "student", str(index)))
        self.assertLessEqual(len(limiter._buckets), 10)

    def test_unknown_and_known_failures_have_same_public_error(self):
        class EmptyQuery:
            def outerjoin(self, *args): return self
            def filter(self, *args): return self
            def limit(self, *args): return self
            def all(self): return []

        class EmptyDb:
            def query(self, *args): return EmptyQuery()

        errors = []
        for identifier in ("known@nitrkl.ac.in", "unknown@nitrkl.ac.in"):
            with self.assertRaises(HTTPException) as caught:
                login(LoginRequest(identifier=identifier, password="wrong", role="student"), EmptyDb())
            errors.append((caught.exception.status_code, caught.exception.detail))
        self.assertEqual(errors[0], errors[1])

    def test_student_and_admin_login_paths_return_429_with_retry_after(self):
        class EmptyQuery:
            def outerjoin(self, *args): return self
            def filter(self, *args): return self
            def limit(self, *args): return self
            def all(self): return []

        class EmptyDb:
            def query(self, *args): return EmptyQuery()

        request = SimpleNamespace(client=SimpleNamespace(host="test-client"))
        for role, identifier in (
            ("student", "limited@nitrkl.ac.in"),
            ("admin", "limited-admin"),
        ):
            for _ in range(5):
                with self.assertRaises(HTTPException) as failed:
                    login(LoginRequest(identifier=identifier, password="wrong", role=role), EmptyDb(), request)
                self.assertEqual(failed.exception.status_code, 401)
            with self.assertRaises(HTTPException) as limited:
                login(LoginRequest(identifier=identifier, password="wrong", role=role), EmptyDb(), request)
            self.assertEqual(limited.exception.status_code, 429)
            self.assertGreater(int(limited.exception.headers["Retry-After"]), 0)


if __name__ == "__main__":
    unittest.main()
