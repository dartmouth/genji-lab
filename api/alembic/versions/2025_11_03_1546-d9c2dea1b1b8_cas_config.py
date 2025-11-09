"""cas config

Revision ID: d9c2dea1b1b8
Revises: a90bd11f6b1c
Create Date: 2025-11-03 15:46:26.514910

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'd9c2dea1b1b8'
down_revision: Union[str, None] = 'a90bd11f6b1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create cas_configuration table
    op.create_table(
        'cas_configuration',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('server_url', sa.String(length=255), nullable=False),
        sa.Column('validation_endpoint', sa.String(length=100), nullable=True, server_default='/serviceValidate'),
        sa.Column('protocol_version', sa.String(length=10), nullable=True, server_default='2.0'),
        sa.Column('xml_namespace', sa.String(length=255), nullable=True, server_default='http://www.yale.edu/tp/cas'),
        sa.Column('attribute_mapping', postgresql.JSONB(astext_type=sa.Text()), nullable=True, 
                  server_default='{"username": "netid", "email": "email", "first_name": "givenName", "last_name": "sn", "full_name": "name"}'),
        sa.Column('username_patterns', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  server_default='["<cas:attribute name=\\"{attr}\\" value=\\"([^\\"]+)\\"", "<cas:{attr}>([^<]+)</cas:{attr}>", "<cas:user>([^<]+)</cas:user>"]'),
        sa.Column('metadata_attributes', postgresql.JSONB(astext_type=sa.Text()), nullable=True,
                  server_default='["uid", "netid", "did", "affil"]'),
        sa.Column('email_domain', sa.String(length=255), nullable=True),
        sa.Column('email_format', sa.String(length=50), nullable=True, server_default='from_cas'),
        sa.Column('display_name', sa.String(length=100), nullable=True, server_default='CAS Login'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['updated_by_id'], ['app.users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        schema='app'
    )
    
    # Create index on primary key
    op.create_index(op.f('ix_app_cas_configuration_id'), 'cas_configuration', ['id'], unique=False, schema='app')
    
    # Create index on foreign key
    op.create_index('idx_cas_configuration_updated_by', 'cas_configuration', ['updated_by_id'], unique=False, schema='app')
    
    op.execute("""
        CREATE SEQUENCE IF NOT EXISTS app.annotation_body_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    """)
    
    op.execute("""
        CREATE SEQUENCE IF NOT EXISTS app.annotation_target_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    """)


def downgrade() -> None:
    # Drop indices first
    op.drop_index('idx_cas_configuration_updated_by', table_name='cas_configuration', schema='app')
    op.drop_index(op.f('ix_app_cas_configuration_id'), table_name='cas_configuration', schema='app')
    
    # Drop table
    op.drop_table('cas_configuration', schema='app')
    # Drop the sequences
    op.execute("DROP SEQUENCE IF EXISTS app.annotation_target_id_seq CASCADE;")
    op.execute("DROP SEQUENCE IF EXISTS app.annotation_body_id_seq CASCADE;")