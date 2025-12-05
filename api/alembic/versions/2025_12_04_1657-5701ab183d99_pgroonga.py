"""pgroonga

Revision ID: 5701ab183d99
Revises: 9cf370b7be08
Create Date: 2025-12-04 16:57:04.667242

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5701ab183d99'
down_revision: Union[str, None] = '9cf370b7be08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # Enable PGroonga extension
    op.execute("CREATE EXTENSION IF NOT EXISTS pgroonga;")
    
    # Drop existing GIN indices for full-text search
    op.execute("DROP INDEX IF EXISTS app.idx_document_elements_content;")
    op.execute("DROP INDEX IF EXISTS app.idx_annotations_body;")
    op.execute("DROP INDEX IF EXISTS app.idx_annotations_target;")
    
    # Create PGroonga indices for multilingual full-text search
    # Index on document_elements.content->>'text'
    op.execute("""
        CREATE INDEX idx_document_elements_content_pgroonga 
        ON app.document_elements 
        USING pgroonga ((content->>'text'))
        WITH (tokenizer='TokenMecab');
    """)
    
    # Index on annotations.body->>'value'
    op.execute("""
        CREATE INDEX idx_annotations_body_pgroonga 
        ON app.annotations 
        USING pgroonga ((body->>'value'))
        WITH (tokenizer='TokenMecab');
    """)
    
    # Note: We removed the target index as it's not used for text search
    # Recreate as regular GIN index for JSONB operations if needed
    op.execute("""
        CREATE INDEX idx_annotations_target 
        ON app.annotations 
        USING gin (target);
    """)


def downgrade():
    # Drop PGroonga indices
    op.execute("DROP INDEX IF EXISTS app.idx_document_elements_content_pgroonga;")
    op.execute("DROP INDEX IF EXISTS app.idx_annotations_body_pgroonga;")
    op.execute("DROP INDEX IF EXISTS app.idx_annotations_target;")
    
    # Recreate original GIN indices for PostgreSQL full-text search
    op.execute("""
        CREATE INDEX idx_document_elements_content 
        ON app.document_elements 
        USING gin (content);
    """)
    
    op.execute("""
        CREATE INDEX idx_annotations_body 
        ON app.annotations 
        USING gin (body);
    """)
    
    op.execute("""
        CREATE INDEX idx_annotations_target 
        ON app.annotations 
        USING gin (target);
    """)