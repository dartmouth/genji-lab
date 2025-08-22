"""add_site_settings_table

Revision ID: c041068b67c3
Revises: b23f8ece0f36
Create Date: 2025-08-20 14:34:40.059076

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c041068b67c3'
down_revision: Union[str, None] = 'b23f8ece0f36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create site_settings table
    op.create_table(
        'site_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('site_title', sa.String(length=50), nullable=False),
        sa.Column('site_logo_url', sa.String(length=255), nullable=True),
        sa.Column('updated_by_id', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by_id'], ['app.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='app'
    )
    op.create_index('idx_site_settings_updated_by', 'site_settings', ['updated_by_id'], unique=False, schema='app')
    
    # Insert default site settings only if a user exists
    op.execute("""
        INSERT INTO app.site_settings (site_title, site_logo_url, updated_by_id, updated_at)
        SELECT 'Site Title', '/favicon.png', u.id, CURRENT_TIMESTAMP
        FROM app.users u
        LIMIT 1
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop index first
    op.drop_index('idx_site_settings_updated_by', table_name='site_settings', schema='app')
    # Drop the site_settings table
    op.drop_table('site_settings', schema='app')
