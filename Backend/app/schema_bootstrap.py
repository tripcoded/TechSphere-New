from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


USER_PROFILE_COLUMN_PATCHES = {
    "roll_no": "ALTER TABLE user_profiles ADD COLUMN roll_no VARCHAR(64)",
    "branch": "ALTER TABLE user_profiles ADD COLUMN branch VARCHAR(120)",
    "year": "ALTER TABLE user_profiles ADD COLUMN year INTEGER",
    "portfolio_url": "ALTER TABLE user_profiles ADD COLUMN portfolio_url VARCHAR(255)",
}


def ensure_runtime_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "user_profiles" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("user_profiles")}
    missing_statements = [
        statement for column_name, statement in USER_PROFILE_COLUMN_PATCHES.items() if column_name not in existing_columns
    ]

    if not missing_statements:
        return

    with engine.begin() as connection:
        for statement in missing_statements:
            connection.execute(text(statement))

