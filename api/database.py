from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv, find_dotenv
import os
load_dotenv()
# Create SQLAlchemy engine
engine = create_engine(os.getenv('SQLALCHEMY_DATABASE_URL'))

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Function to create schema if it doesn't exist
# def create_schema():
#     schema_name = os.environ.get("DB_SCHEMA")
#     sql = text(f"CREATE SCHEMA IF NOT EXISTS {schema_name};")
#     with engine.connect() as conn:
#         conn.execute(sql)
#         conn.commit()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()