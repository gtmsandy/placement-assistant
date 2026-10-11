import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from fastapi import Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("JWT_SECRET_KEY", "cookie-auth-test-secret-with-at-least-32-bytes")
os.environ.setdefault("APP_ENV", "development")

from database import Base, get_db  # noqa: E402
from main import app  # noqa: E402
from main import configured_cors_origins  # noqa: E402
from models import Student, User  # noqa: E402
from password_security import hash_password  # noqa: E402
from routers.auth import ACCESS_COOKIE_NAME  # noqa: E402
from routers.auth import logout  # noqa: E402
from login_rate_limiter import login_rate_limiter  # noqa: E402
from storage_config import get_upload_root  # noqa: E402


class CookieAuthenticationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.Session = sessionmaker(bind=cls.engine)
        Base.metadata.create_all(cls.engine)
        with cls.Session() as db:
            student = Student(
                name="Cookie Student",
                email="cookie@nitrkl.ac.in",
                roll_no="COOKIE1",
                mobile="9876543210",
                branch="CSE",
                graduation_year=2028,
                cgpa=8.5,
                tenth_percentage=90,
                twelfth_percentage=90,
            )
            db.add(student)
            db.flush()
            db.add(User(
                username="cookie-user",
                password_hash=hash_password("cookie-password"),
                role="student",
                student_id=student.id,
            ))
            db.add(User(
                username="cookie-admin",
                password_hash=hash_password("admin-password"),
                role="admin",
            ))
            db.commit()
            cls.student_id = student.id

        def override_db():
            db = cls.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(cls.engine)
        cls.engine.dispose()

    def setUp(self):
        self.client.cookies.clear()
        login_rate_limiter.reset()

    def login(self):
        return self.client.post("/api/auth/login", json={
            "identifier": "cookie@nitrkl.ac.in",
            "password": "cookie-password",
            "role": "student",
        })

    def test_login_sets_httponly_cookie_and_hides_jwt(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("access_token", response.json())
        cookie = response.headers["set-cookie"]
        self.assertIn(f"{ACCESS_COOKIE_NAME}=", cookie)
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=lax", cookie)
        self.assertIn("Path=/api", cookie)

    def test_mobile_and_admin_logins_set_cookie(self):
        for identifier, password, role in (
            ("9876543210", "cookie-password", "student"),
            ("cookie-admin", "admin-password", "admin"),
        ):
            self.client.cookies.clear()
            response = self.client.post("/api/auth/login", json={
                "identifier": identifier,
                "password": password,
                "role": role,
            })
            self.assertEqual(response.status_code, 200)
            self.assertIn(f"{ACCESS_COOKIE_NAME}=", response.headers["set-cookie"])

    def test_invalid_and_rate_limited_login_set_no_cookie(self):
        payload = {
            "identifier": "missing@nitrkl.ac.in",
            "password": "wrong",
            "role": "student",
        }
        for _ in range(5):
            response = self.client.post("/api/auth/login", json=payload)
            self.assertEqual(response.status_code, 401)
            self.assertNotIn(ACCESS_COOKIE_NAME, response.headers.get("set-cookie", ""))
        limited = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(limited.status_code, 429)
        self.assertNotIn(ACCESS_COOKIE_NAME, limited.headers.get("set-cookie", ""))

    def test_session_get_needs_no_csrf_but_logout_does(self):
        login = self.login()
        csrf = login.json()["csrf_token"]
        self.assertEqual(self.client.get("/api/auth/session").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/logout").status_code, 403)
        logged_out = self.client.post(
            "/api/auth/logout",
            headers={"X-CSRF-Token": csrf},
        )
        self.assertEqual(logged_out.status_code, 200)
        self.assertIn("Max-Age=0", logged_out.headers["set-cookie"])
        self.assertEqual(self.client.get("/api/auth/session").status_code, 401)

    def test_wrong_csrf_is_rejected(self):
        self.login()
        response = self.client.post(
            "/api/auth/logout",
            headers={"X-CSRF-Token": "wrong"},
        )
        self.assertEqual(response.status_code, 403)

    def test_patch_and_delete_require_session_csrf(self):
        csrf = self.login().json()["csrf_token"]
        endpoint = f"/api/students/{self.student_id}"
        self.assertEqual(
            self.client.patch(endpoint, json={"name": "Cookie Student"}).status_code,
            403,
        )
        self.assertEqual(
            self.client.patch(
                endpoint,
                json={"name": "Cookie Student"},
                headers={"X-CSRF-Token": csrf},
            ).status_code,
            200,
        )
        self.assertEqual(self.client.delete("/api/not-a-route").status_code, 403)
        self.assertEqual(
            self.client.delete(
                "/api/not-a-route",
                headers={"X-CSRF-Token": csrf},
            ).status_code,
            404,
        )

    def test_csrf_token_from_another_session_is_rejected(self):
        client_a = TestClient(app)
        client_b = TestClient(app)
        csrf_a = client_a.post("/api/auth/login", json={
            "identifier": "cookie@nitrkl.ac.in",
            "password": "cookie-password",
            "role": "student",
        }).json()["csrf_token"]
        client_b.post("/api/auth/login", json={
            "identifier": "cookie@nitrkl.ac.in",
            "password": "cookie-password",
            "role": "student",
        })
        response = client_b.post(
            "/api/auth/logout",
            headers={"X-CSRF-Token": csrf_a},
        )
        self.assertEqual(response.status_code, 403)

    def test_logout_revokes_old_cookie_and_new_login_works(self):
        login = self.login()
        csrf = login.json()["csrf_token"]
        old_cookie = self.client.cookies.get(ACCESS_COOKIE_NAME)
        self.assertIsNotNone(old_cookie)
        self.assertEqual(
            self.client.post(
                "/api/auth/logout",
                headers={"X-CSRF-Token": csrf},
            ).status_code,
            200,
        )
        self.client.cookies.set(ACCESS_COOKIE_NAME, old_cookie, path="/api")
        self.assertEqual(self.client.get("/api/auth/session").status_code, 401)
        self.client.cookies.clear()
        self.assertEqual(self.login().status_code, 200)

    def test_public_login_is_csrf_exempt_even_with_existing_cookie(self):
        self.login()
        response = self.client.post("/api/auth/login", json={
            "identifier": "cookie@nitrkl.ac.in",
            "password": "cookie-password",
            "role": "student",
        })
        self.assertEqual(response.status_code, 200)

    def test_registration_and_recovery_routes_are_not_blocked_by_csrf(self):
        self.login()
        registration = self.client.post(
            "/api/auth/register/request",
            json={"email": "not-an-institutional-address@example.com"},
        )
        self.assertNotEqual(registration.status_code, 403)
        recovery = self.client.post(
            "/api/auth/password-recovery/request",
            json={"identifier": "unknown-cookie-test@nitrkl.ac.in"},
        )
        self.assertNotEqual(recovery.status_code, 403)

    def test_logout_database_failure_rolls_back(self):
        class FailingDb:
            rolled_back = False

            def commit(self):
                raise RuntimeError("database detail")

            def rollback(self):
                self.rolled_back = True

        with self.Session() as db:
            user = db.query(User).filter(User.username == "cookie-user").first()
            failing_db = FailingDb()
            response = Response()
            result = logout(response, user, failing_db)
            self.assertEqual(response.status_code, 500)
            self.assertEqual(result, {"detail": "Logout failed."})
            self.assertIn("Max-Age=0", response.headers["set-cookie"])
            self.assertTrue(failing_db.rolled_back)

    def test_api_security_headers_are_present(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.headers["x-content-type-options"], "nosniff")
        self.assertEqual(response.headers["x-frame-options"], "DENY")
        self.assertEqual(response.headers["cache-control"], "no-store")
        auth_response = self.client.get("/api/auth/session")
        self.assertEqual(auth_response.headers["cache-control"], "no-store")

    def test_cors_allows_documented_dev_origin_and_rejects_arbitrary_origin(self):
        allowed = self.client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertEqual(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173")
        rejected = self.client.options(
            "/api/health",
            headers={
                "Origin": "https://attacker.example",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertIsNone(rejected.headers.get("access-control-allow-origin"))

    def test_production_cors_and_storage_fail_closed(self):
        old_environment = os.environ.get("APP_ENV")
        old_origins = os.environ.pop("ALLOWED_ORIGINS", None)
        old_upload_root = os.environ.pop("UPLOAD_ROOT", None)
        os.environ["APP_ENV"] = "production"
        try:
            self.assertEqual(configured_cors_origins(), [])
            with self.assertRaises(RuntimeError):
                get_upload_root()
            os.environ["ALLOWED_ORIGINS"] = "*"
            with self.assertRaises(RuntimeError):
                configured_cors_origins()
            os.environ.pop("APP_ENV", None)
            os.environ.pop("ALLOWED_ORIGINS", None)
            with self.assertRaises(RuntimeError):
                get_upload_root()
            os.environ["APP_ENV"] = "prod"
            with self.assertRaises(RuntimeError):
                get_upload_root()
        finally:
            if old_environment is None:
                os.environ.pop("APP_ENV", None)
            else:
                os.environ["APP_ENV"] = old_environment
            if old_origins is None:
                os.environ.pop("ALLOWED_ORIGINS", None)
            else:
                os.environ["ALLOWED_ORIGINS"] = old_origins
            if old_upload_root is not None:
                os.environ["UPLOAD_ROOT"] = old_upload_root

    def test_production_cookie_is_secure(self):
        old = os.environ.get("APP_ENV")
        try:
            for environment in ("production", "prod"):
                with self.subTest(environment=environment):
                    os.environ["APP_ENV"] = environment
                    self.client.cookies.clear()
                    response = self.login()
                    self.assertIn("Secure", response.headers["set-cookie"])
        finally:
            if old is None:
                os.environ.pop("APP_ENV", None)
            else:
                os.environ["APP_ENV"] = old


if __name__ == "__main__":
    unittest.main()
