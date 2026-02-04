from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("SQLALCHEMY_DATABASE_URL")
if not DATABASE_URL:
    if "PYTEST_CURRENT_TEST" in os.environ:
        DATABASE_URL = "sqlite:///:memory:"
    else:
        raise ValueError("SQLALCHEMY_DATABASE_URL environment variable is not set")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL,
                        pool_size=10,
                        max_overflow=20,
                        pool_recycle=3600,      # Recycle connections after 1 hour
                        pool_pre_ping=True,     # Verify connections before using
                        pool_timeout=30
    )

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
