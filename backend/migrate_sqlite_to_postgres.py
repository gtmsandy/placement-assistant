import sqlite3

from sqlalchemy import create_engine, MetaData, select, text
from sqlalchemy.orm import Session

from database import engine


SQLITE_URL = "sqlite:///placement.db"

sqlite_engine = create_engine(SQLITE_URL)
sqlite_metadata = MetaData()
sqlite_metadata.reflect(bind=sqlite_engine)

postgres_metadata = MetaData()
postgres_metadata.reflect(bind=engine)

tables = [
    "students",
    "users",
    "placement_drives",
    "applications",
]

with engine.begin() as conn:
    for table_name in reversed(tables):
        conn.execute(text(f'DELETE FROM "{table_name}"'))

print("POSTGRES TABLES CLEARED")

with sqlite_engine.connect() as sqlite_conn:
    with engine.begin() as postgres_conn:

        for table_name in tables:
            source_table = sqlite_metadata.tables[table_name]
            target_table = postgres_metadata.tables[table_name]

            rows = sqlite_conn.execute(
                select(source_table)
            ).mappings().all()

            if not rows:
                print(f"{table_name}: 0 rows")
                continue

            target_columns = {
                column.name for column in target_table.columns
            }

            data = []

            for row in rows:
                item = {
                    key: value
                    for key, value in row.items()
                    if key in target_columns
                }
                data.append(item)

            postgres_conn.execute(
                target_table.insert(),
                data
            )

            print(f"{table_name}: {len(data)} rows migrated")

        for table_name in tables:
            sequence_sql = text(
                f"""
                SELECT setval(
                    pg_get_serial_sequence('"{table_name}"', 'id'),
                    COALESCE(MAX(id), 1),
                    MAX(id) IS NOT NULL
                )
                FROM "{table_name}"
                """
            )

            try:
                postgres_conn.execute(sequence_sql)
            except Exception:
                pass

print()
print("MIGRATION COMPLETE")