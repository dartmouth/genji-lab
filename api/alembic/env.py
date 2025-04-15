from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import your models to access the metadata
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from models.models import Base, metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config


schema = os.environ.get('DB_SCHEMA')
if not schema:
    schema = 'app'  # Default fallback
    print(f"Warning: DB_SCHEMA environment variable not set, using '{schema}'")
else:
    print(f"Using schema: {schema}")

Base.metadata.schema = schema

# Override the sqlalchemy.url in the alembic.ini file with the DATABASE_URL from environment
db_url = os.environ.get("SQLALCHEMY_DATABASE_URL")

if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set target metadata
# This should reference your SQLAlchemy Base.metadata
target_metadata = Base.metadata

# Get schema from environment
schema = os.environ.get('DB_SCHEMA', 'app')


def include_object(object, name, type_, reflected, compare_to):
    """Filter objects for autogenerate"""
    # You can add custom logic here to include or exclude certain objects
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
        include_object=include_object,
        version_table_schema=schema,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            include_schemas=True,
            include_object=include_object,
            version_table_schema=schema,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()