"""Quick PostgreSQL connectivity check using .env values."""

import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine

BACKEND_ROOT = Path(__file__).resolve().parent
ENV_FILE = BACKEND_ROOT / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=True)

user = os.getenv("user", "")
password = quote_plus(os.getenv("password", ""))
host = os.getenv("host", "")
port = os.getenv("port", "")
dbname = os.getenv("dbname", "")

database_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}?sslmode=require"
engine = create_engine(database_url)

try:
    with engine.connect():
        print("Connection successful!")
except Exception as exc:
    print(f"Failed to connect: {exc}")
