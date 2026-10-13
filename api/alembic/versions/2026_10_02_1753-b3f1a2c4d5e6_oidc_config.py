"""oidc config

Revision ID: b3f1a2c4d5e6
Revises: 2088c7ea8d55
Create Date: 2026-10-02 17:53:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b3f1a2c4d5e6'
down_revision: Union[str, None] = '2088c7ea8d55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create oidc_configuration table
    op.create_table(
        'oidc_configuration',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('button_label', sa.String(length=100), nullable=True, server_default='Sign in with Dartmouth'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by_id'], ['app.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='app'
    )

    # Create index on primary key
    op.create_index(op.f('ix_app_oidc_configuration_id'), 'oidc_configuration', ['id'], unique=False, schema='app')

    # Create index on foreign key
    op.create_index('idx_oidc_configuration_updated_by', 'oidc_configuration', ['updated_by_id'], unique=False, schema='app')


def downgrade() -> None:
    # Drop indices first
    op.drop_index('idx_oidc_configuration_updated_by', table_name='oidc_configuration', schema='app')
    op.drop_index(op.f('ix_app_oidc_configuration_id'), table_name='oidc_configuration', schema='app')

    # Drop table
    op.drop_table('oidc_configuration', schema='app')
