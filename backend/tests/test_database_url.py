import logging
import sys
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database import normalize_database_url  # noqa: E402


class DatabaseUrlNormalizationTests(unittest.TestCase):
    def test_bare_postgresql_url_selects_psycopg2(self):
        self.assertEqual(
            normalize_database_url("postgresql://host/database"),
            "postgresql+psycopg2://host/database",
        )

    def test_legacy_postgres_url_selects_psycopg2(self):
        self.assertEqual(
            normalize_database_url("postgres://host/database"),
            "postgresql+psycopg2://host/database",
        )

    def test_explicit_psycopg2_url_is_unchanged(self):
        value = "postgresql+psycopg2://host/database"
        self.assertEqual(normalize_database_url(value), value)

    def test_credentials_path_and_query_are_preserved(self):
        value = (
            "postgresql://user:p%40ss@database.example:5432/"
            "placement?sslmode=require&application_name=placement"
        )
        self.assertEqual(
            normalize_database_url(value),
            value.replace(
                "postgresql://",
                "postgresql+psycopg2://",
                1,
            ),
        )

    def test_database_password_is_not_logged(self):
        value = "postgresql://user:do-not-log@host/database"
        with self.assertNoLogs(level=logging.DEBUG):
            normalize_database_url(value)

    def test_other_explicit_driver_is_not_rewritten(self):
        value = "postgresql+psycopg://host/database"
        self.assertEqual(normalize_database_url(value), value)

    def test_bare_postgresql_engine_uses_psycopg2_dialect(self):
        engine = create_engine(
            normalize_database_url("postgresql://host/database"),
            poolclass=NullPool,
        )
        try:
            self.assertEqual(
                engine.url.drivername,
                "postgresql+psycopg2",
            )
            self.assertEqual(engine.dialect.driver, "psycopg2")
        finally:
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
