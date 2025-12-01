"""Add description and created_at to roles.

Revision ID: 0041_add_role_fields
Revises: 0040_add_user_role_id
Create Date: 2025-11-30
"""
from alembic import op
import sqlalchemy as sa

revision = '0041_add_role_fields'
down_revision = '0040_add_user_role_id'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('roles', sa.Column('description', sa.String(255), nullable=True))
    op.add_column('roles', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))


def downgrade() -> None:
    op.drop_column('roles', 'created_at')
    op.drop_column('roles', 'description')
