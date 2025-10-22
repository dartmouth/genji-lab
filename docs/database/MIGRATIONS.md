# Database Migrations Guide

**Project**: Genji Document Annotation Platform  
**Migration Tool**: Alembic  
**Last Updated**: October 22, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Common Commands](#common-commands)
4. [Creating Migrations](#creating-migrations)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Production Migrations](#production-migrations)

---

## Overview

### What is Alembic?

Alembic is a database migration tool for SQLAlchemy. It allows you to:
- Version control your database schema
- Track changes over time
- Apply changes consistently across environments
- Rollback changes if needed

### Migration Workflow

```mermaid
graph LR
    A[Modify Models] --> B[Generate Migration]
    B --> C[Review Migration]
    C --> D{Looks Good?}
    D -->|No| E[Edit Migration]
    E --> C
    D -->|Yes| F[Apply Migration]
    F --> G[Test Changes]
    G --> H{Works?}
    H -->|No| I[Rollback]
    I --> C
    H -->|Yes| J[Commit to Git]
```

---

## Quick Start

### Directory Structure

```
api/
├── alembic/
│   ├── versions/           # Migration files stored here
│   │   ├── abc123_initial.py
│   │   ├── def456_add_groups.py
│   │   └── ...
│   ├── env.py             # Alembic environment configuration
│   ├── script.py.mako     # Template for new migrations
│   └── README
├── alembic.ini            # Alembic configuration file
└── models/
    └── models.py          # SQLAlchemy models
```

### Configuration Files

**alembic.ini**:
```ini
[alembic]
script_location = alembic
sqlalchemy.url = driver://user:pass@localhost/dbname

[post_write_hooks]
# Optional: Format migrations with black
# hooks = black
# black.type = console_scripts
# black.entrypoint = black
```

**alembic/env.py**:
```python
from models import models  # Import your models
target_metadata = models.Base.metadata
```

---

## Common Commands

All commands should be run from the `api/` directory or via Docker Compose.

### With Docker Compose (Recommended)

```bash
# Navigate to project root
cd c:\RCProjects\rc-genji

# Generate a new migration
docker compose run --remove-orphans migrations revision --autogenerate -m "description"

# Apply all migrations
docker compose run --remove-orphans migrations upgrade head

# Rollback one migration
docker compose run --remove-orphans migrations downgrade -1

# View current version
docker compose run --remove-orphans migrations current

# View migration history
docker compose run --remove-orphans migrations history

# Show SQL without applying
docker compose run --remove-orphans migrations upgrade head --sql
```

### Without Docker

```bash
# Navigate to api directory
cd api

# Activate virtual environment
source env/bin/activate  # Linux/Mac
.\env\Scripts\activate   # Windows

# Run alembic commands
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
alembic current
alembic history
```

---

## Creating Migrations

### 1. Auto-Generate Migration

**Step 1**: Modify your SQLAlchemy models

```python
# api/models/models.py

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'schema': 'app'}
    
    id = Column(Integer, primary_key=True)
    # ... existing fields ...
    
    # ADD NEW FIELD
    phone_number = Column(String(20), nullable=True)
```

**Step 2**: Generate migration

```bash
docker compose run --remove-orphans migrations revision --autogenerate -m "add phone number to users"
```

**Step 3**: Review generated file

```python
# alembic/versions/abc123_add_phone_number_to_users.py

"""add phone number to users

Revision ID: abc123def456
Revises: xyz789
Create Date: 2025-10-22 10:30:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'abc123def456'
down_revision = 'xyz789'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column(
        'users',
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        schema='app'
    )

def downgrade():
    op.drop_column('users', 'phone_number', schema='app')
```

**Step 4**: Apply migration

```bash
docker compose run --remove-orphans migrations upgrade head
```

---

### 2. Manual Migration

For complex changes, create an empty migration:

```bash
docker compose run --remove-orphans migrations revision -m "complex data migration"
```

Edit the generated file:

```python
def upgrade():
    # Custom SQL or operations
    op.execute("""
        UPDATE app.users 
        SET is_active = true 
        WHERE is_active IS NULL
    """)
    
    # Then make schema change
    op.alter_column(
        'users',
        'is_active',
        nullable=False,
        schema='app'
    )

def downgrade():
    op.alter_column(
        'users',
        'is_active',
        nullable=True,
        schema='app'
    )
```

---

## Best Practices

### ✅ DO

1. **Always review auto-generated migrations**
   ```bash
   # Check the migration file before applying
   cat alembic/versions/abc123_*.py
   ```

2. **Test on development first**
   ```bash
   # Apply to dev database
   docker compose run migrations upgrade head
   
   # Test your application
   # If issues found, rollback
   docker compose run migrations downgrade -1
   ```

3. **Include both upgrade and downgrade**
   ```python
   def upgrade():
       # Forward migration
       pass
   
   def downgrade():
       # Backward migration (must undo upgrade)
       pass
   ```

4. **Use descriptive migration messages**
   ```bash
   # Good
   -m "add user phone number and email verification"
   
   # Bad
   -m "update users"
   ```

5. **One logical change per migration**
   - Don't mix unrelated changes
   - Easier to review and rollback

6. **Test rollback before committing**
   ```bash
   docker compose run migrations upgrade head
   docker compose run migrations downgrade -1
   docker compose run migrations upgrade head
   ```

---

### ❌ DON'T

1. **Don't modify existing migrations** after they're applied
   - Create a new migration instead
   - Exception: Development-only migrations not in production

2. **Don't skip reviewing auto-generated migrations**
   - Alembic may miss complex relationships
   - May generate suboptimal SQL

3. **Don't forget the schema prefix**
   ```python
   # BAD - missing schema
   op.add_column('users', ...)
   
   # GOOD - includes schema
   op.add_column('users', ..., schema='app')
   ```

4. **Don't use migrations for data that changes**
   - Use migrations for schema changes
   - Use seed scripts for initial data
   - Use application code for dynamic data

5. **Don't commit broken migrations**
   - Always test before committing
   - Check both upgrade and downgrade

---

## Migration Operations Reference

### Adding Columns

```python
def upgrade():
    op.add_column(
        'users',
        sa.Column('bio', sa.Text(), nullable=True),
        schema='app'
    )

def downgrade():
    op.drop_column('users', 'bio', schema='app')
```

### Modifying Columns

```python
def upgrade():
    # Change column type
    op.alter_column(
        'users',
        'age',
        type_=sa.Integer(),
        existing_type=sa.String(),
        schema='app'
    )
    
    # Add NOT NULL constraint
    op.alter_column(
        'users',
        'email',
        nullable=False,
        schema='app'
    )

def downgrade():
    op.alter_column('users', 'age', type_=sa.String(), schema='app')
    op.alter_column('users', 'email', nullable=True, schema='app')
```

### Creating Tables

```python
def upgrade():
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('app.users.id')),
        sa.Column('theme', sa.String(20)),
        sa.Column('notifications_enabled', sa.Boolean(), default=True),
        schema='app'
    )

def downgrade():
    op.drop_table('user_preferences', schema='app')
```

### Adding Indexes

```python
def upgrade():
    op.create_index(
        'idx_users_email_active',
        'users',
        ['email', 'is_active'],
        schema='app'
    )

def downgrade():
    op.drop_index('idx_users_email_active', schema='app')
```

### Adding Foreign Keys

```python
def upgrade():
    op.create_foreign_key(
        'fk_documents_owner',
        'documents',
        'users',
        ['owner_id'],
        ['id'],
        source_schema='app',
        referent_schema='app'
    )

def downgrade():
    op.drop_constraint('fk_documents_owner', 'documents', schema='app')
```

### Custom SQL

```python
def upgrade():
    op.execute("""
        CREATE INDEX CONCURRENTLY idx_annotations_body_gin 
        ON app.annotations USING gin(body)
    """)

def downgrade():
    op.execute("DROP INDEX app.idx_annotations_body_gin")
```

---

## Troubleshooting

### Issue: Alembic Can't Detect Changes

**Problem**: Modified model but `--autogenerate` creates empty migration

**Solutions**:
1. Check that models are imported in `alembic/env.py`
2. Verify `target_metadata` is set correctly
3. Ensure database connection works
4. Some changes must be manual (e.g., enum types)

```python
# alembic/env.py
from models import models  # Must import all models
target_metadata = models.Base.metadata  # Must be set
```

---

### Issue: Migration Conflicts

**Problem**: Multiple developers create migrations simultaneously

**Solution**: Merge migrations carefully
```bash
# Check history
docker compose run migrations history

# If you have conflicting revisions:
# 1. Coordinate with team on which migration came first
# 2. Edit the newer migration's down_revision
# 3. Or use branches and merge migrations
```

---

### Issue: Failed Migration

**Problem**: Migration applied partially and failed

**Solution**:
```bash
# 1. Check current state
docker compose run migrations current

# 2. Check what's in the database
psql -h localhost -U user -d genji -c "SELECT * FROM alembic_version"

# 3. Manually fix database if needed
psql -h localhost -U user -d genji
# ... manual fixes ...

# 4. Update alembic_version table to correct state
UPDATE alembic_version SET version_num = 'correct_version';

# 5. Continue with migrations
docker compose run migrations upgrade head
```

---

### Issue: Need to Skip a Migration

**Problem**: Migration doesn't apply to current environment

**Solution**: Use stamps
```bash
# Mark migration as applied without running it
docker compose run migrations stamp abc123def456

# Or mark as not applied
docker compose run migrations downgrade abc123def456
```

---

### Issue: Foreign Key Constraints

**Problem**: Can't drop table due to foreign key references

**Solution**: Drop constraints first
```python
def upgrade():
    # Drop constraints first
    op.drop_constraint('fk_name', 'table', schema='app')
    # Then drop table
    op.drop_table('table', schema='app')

def downgrade():
    # Recreate in reverse order
    op.create_table(...)
    op.create_foreign_key(...)
```

---

## Production Migrations

### Pre-Migration Checklist

- [ ] Migration tested in development
- [ ] Rollback tested in development
- [ ] Database backup created
- [ ] Downtime scheduled (if needed)
- [ ] Team notified
- [ ] Monitoring prepared

### Migration Strategy

#### 1. Zero-Downtime Migrations

For changes that can be applied without downtime:

```python
# Step 1: Add new column (nullable)
def upgrade():
    op.add_column('users', sa.Column('new_field', sa.String(), nullable=True))

# Step 2: Deploy application code that writes to both old and new
# (Deploy this before running Step 3)

# Step 3: Backfill data
def upgrade():
    op.execute("UPDATE app.users SET new_field = old_field WHERE new_field IS NULL")

# Step 4: Make column non-nullable
def upgrade():
    op.alter_column('users', 'new_field', nullable=False)

# Step 5: Deploy application code that only uses new field

# Step 6: Drop old column
def upgrade():
    op.drop_column('users', 'old_field')
```

#### 2. With Downtime

For breaking changes:

1. Schedule maintenance window
2. Put application in maintenance mode
3. Backup database
4. Run migrations
5. Test application
6. Remove maintenance mode

### Backup Before Migration

```bash
# Create backup
docker compose exec db pg_dump -U postgres genji > backup_$(date +%Y%m%d_%H%M%S).sql

# Or via pg_dump directly
pg_dump -h localhost -U postgres -d genji > backup.sql

# Restore if needed
psql -h localhost -U postgres -d genji < backup.sql
```

### Production Migration Commands

```bash
# 1. Backup database
docker compose exec db pg_dump -U postgres genji > pre_migration_backup.sql

# 2. Check current version
docker compose run migrations current

# 3. Preview changes (dry run)
docker compose run migrations upgrade head --sql > migration.sql
cat migration.sql  # Review SQL

# 4. Apply migration
docker compose run migrations upgrade head

# 5. Verify success
docker compose run migrations current
# Test application

# 6. If issues, rollback
docker compose run migrations downgrade -1
```

---

## Migration History

### Viewing History

```bash
# View all migrations
docker compose run migrations history

# View with details
docker compose run migrations history --verbose

# View specific range
docker compose run migrations history -r abc:def
```

### Example Output

```
abc123 -> def456 (head), add user phone number
xyz789 -> abc123, add groups table
initial -> xyz789, initial schema
```

---

## Advanced Topics

### Branching

For feature branches with database changes:

```bash
# Create branch migration
docker compose run migrations revision -m "feature: new table" --branch-label=feature_x

# Merge branches
docker compose run migrations merge -m "merge feature_x" feature_x head
```

### Multiple Databases

If you need to manage multiple databases:

```python
# alembic.ini
[alembic:prod]
sqlalchemy.url = postgresql://prod_url

[alembic:dev]
sqlalchemy.url = postgresql://dev_url
```

```bash
# Use specific config
alembic -n prod upgrade head
```

---

## Common Migration Patterns

### 1. Adding a New Table

```python
def upgrade():
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('app.users.id')),
        sa.Column('message', sa.Text()),
        sa.Column('read', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        schema='app'
    )
    
    op.create_index('idx_notifications_user', 'notifications', ['user_id'], schema='app')
```

### 2. Data Migration

```python
from sqlalchemy import table, column

def upgrade():
    # Define table for data migration
    users = table('users',
        column('id', sa.Integer),
        column('old_status', sa.String),
        column('new_status', sa.String)
    )
    
    # Update data
    op.execute(
        users.update()
        .where(users.c.old_status == 'active')
        .values(new_status='enabled')
    )
```

### 3. Renaming Column

```python
def upgrade():
    op.alter_column(
        'users',
        'old_name',
        new_column_name='new_name',
        schema='app'
    )
```

### 4. Changing Column Type

```python
def upgrade():
    # Add new column
    op.add_column('users', sa.Column('age_new', sa.Integer()), schema='app')
    
    # Copy and convert data
    op.execute("UPDATE app.users SET age_new = CAST(age_old AS INTEGER)")
    
    # Drop old column
    op.drop_column('users', 'age_old', schema='app')
    
    # Rename new column
    op.alter_column('users', 'age_new', new_column_name='age', schema='app')
```

---

## See Also

- **[Database Schema](SCHEMA.md)** - Complete schema documentation
- **[Tables Reference](TABLES.md)** - Quick table reference
- **[Alembic Documentation](https://alembic.sqlalchemy.org/)** - Official docs

---

**Last Updated**: October 22, 2025  
**Alembic Version**: Latest
