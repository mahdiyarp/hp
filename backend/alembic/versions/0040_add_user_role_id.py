"""Add role_id FK to users.

Revision ID: 0040_add_user_role_id
Revises: 0039_invoice_overhaul
Create Date: 2025-11-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0040_add_user_role_id'
down_revision = '0039_invoice_overhaul'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add role_id column (nullable) and FK to roles
    op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=True))
    op.create_index('ix_users_role_id', 'users', ['role_id'])
    op.create_foreign_key('fk_users_role_id_roles', 'users', 'roles', ['role_id'], ['id'])


def downgrade() -> None:
    # Drop FK and column
    op.drop_constraint('fk_users_role_id_roles', 'users', type_='foreignkey')
    op.drop_index('ix_users_role_id', table_name='users')
    op.drop_column('users', 'role_id')
