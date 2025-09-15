"""add_classroom_id_to_annotations

Revision ID: 277db77aebf5
Revises: 0fd077a09577
Create Date: 2025-09-15 15:25:32.563229

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '277db77aebf5'
down_revision: Union[str, None] = '0fd077a09577'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add classroom_id column to annotations table
    op.add_column('annotations', sa.Column('classroom_id', sa.Integer(), nullable=True), schema='app')
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_annotations_classroom_id',
        'annotations', 'groups',
        ['classroom_id'], ['id'],
        source_schema='app', referent_schema='app'
    )
    
    # Add index for performance
    op.create_index('idx_annotations_classroom_id', 'annotations', ['classroom_id'], schema='app')


def downgrade() -> None:
    """Downgrade schema."""
    # Remove index
    op.drop_index('idx_annotations_classroom_id', 'annotations', schema='app')
    
    # Remove foreign key constraint
    op.drop_constraint('fk_annotations_classroom_id', 'annotations', schema='app', type_='foreignkey')
    
    # Remove classroom_id column
    op.drop_column('annotations', 'classroom_id', schema='app')
