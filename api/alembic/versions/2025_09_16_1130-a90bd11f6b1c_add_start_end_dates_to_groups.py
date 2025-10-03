"""add_start_end_dates_to_groups

Revision ID: a90bd11f6b1c
Revises: f26ae4b5a319
Create Date: 2025-09-16 11:30:13.781291

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.schema import Sequence, CreateSequence

# revision identifiers, used by Alembic.
revision: str = 'a90bd11f6b1c'
down_revision: Union[str, None] = 'f26ae4b5a319'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add columns as nullable first (existing groups will have NULL values)
    op.add_column('groups', sa.Column('start_date', sa.Date(), nullable=True), schema='app')
    op.add_column('groups', sa.Column('end_date', sa.Date(), nullable=True), schema='app')
    
    # Add check constraint to ensure end_date > start_date (but only when both are not NULL)
    op.create_check_constraint(
        'ck_groups_end_date_after_start_date',
        'groups',
        'end_date > start_date OR start_date IS NULL OR end_date IS NULL',
        schema='app'
    )

    op.execute(CreateSequence(Sequence('annotation_body_id_seq', schema='app', start=1)))
    op.execute(CreateSequence(Sequence('annotation_target_id_seq', schema='app', start=1)))


def downgrade() -> None:
    """Downgrade schema."""
    # Drop check constraint first
    op.drop_constraint('ck_groups_end_date_after_start_date', 'groups', schema='app')
    
    # Drop columns
    op.drop_column('groups', 'end_date', schema='app')
    op.drop_column('groups', 'start_date', schema='app')
