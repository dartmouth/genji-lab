"""add_instructor_role

Revision ID: f26ae4b5a319
Revises: 277db77aebf5
Create Date: 2025-09-16 10:59:50.300118

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


# revision identifiers, used by Alembic.
revision: str = 'f26ae4b5a319'
down_revision: Union[str, None] = '277db77aebf5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add instructor role and assign create_group permission."""
    # Define table structures for data operations
    roles_table = table('roles',
        column('name', sa.String),
        column('description', sa.String),
        schema='app'
    )
    
    role_permissions_table = table('role_permissions',
        column('role_id', sa.Integer),
        column('permission_id', sa.Integer),
        schema='app'
    )
    
    # Get database connection
    connection = op.get_bind()
    
    # Check if instructor role already exists (in case it was added manually)
    result = connection.execute(
        sa.text("SELECT id FROM app.roles WHERE name = 'instructor'")
    ).fetchone()
    
    if result is None:
        # Insert the instructor role
        op.bulk_insert(roles_table, [
            {'name': 'instructor', 'description': 'Class instructor or group leader'}
        ])
        
        # Get the instructor role ID
        instructor_result = connection.execute(
            sa.text("SELECT id FROM app.roles WHERE name = 'instructor'")
        ).fetchone()
        instructor_role_id = instructor_result[0] if instructor_result else None
    else:
        instructor_role_id = result[0]
    
    # Get the create_group permission ID
    permission_result = connection.execute(
        sa.text("SELECT id FROM app.permissions WHERE name = 'create_group'")
    ).fetchone()
    create_group_permission_id = permission_result[0] if permission_result else None
    
    if instructor_role_id is None or create_group_permission_id is None:
        raise Exception("Failed to find instructor role or create_group permission")
    
    # Check if the role-permission mapping already exists
    existing_mapping = connection.execute(
        sa.text("SELECT 1 FROM app.role_permissions WHERE role_id = :role_id AND permission_id = :permission_id"),
        {'role_id': instructor_role_id, 'permission_id': create_group_permission_id}
    ).fetchone()
    
    if existing_mapping is None:
        # Add the instructor role to create_group permission mapping
        op.bulk_insert(role_permissions_table, [
            {'role_id': instructor_role_id, 'permission_id': create_group_permission_id}
        ])


def downgrade() -> None:
    """Remove instructor role and its permissions."""
    # Get database connection
    connection = op.get_bind()
    
    # Get the instructor role ID
    result = connection.execute(
        sa.text("SELECT id FROM app.roles WHERE name = 'instructor'")
    ).fetchone()
    
    if result is not None:
        instructor_role_id = result[0]
        
        # First, remove any user assignments to the instructor role
        connection.execute(
            sa.text("DELETE FROM app.user_roles WHERE role_id = :role_id"),
            {'role_id': instructor_role_id}
        )
        
        # Then, remove role-permission mappings for instructor role
        connection.execute(
            sa.text("DELETE FROM app.role_permissions WHERE role_id = :role_id"),
            {'role_id': instructor_role_id}
        )
        
        # Finally, remove the instructor role
        connection.execute(
            sa.text("DELETE FROM app.roles WHERE name = 'instructor'")
        )
