"""add mobile to users

Revision ID: 0023
Revises: 0022
Create Date: 2025-11-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0023'
down_revision = '0022'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('mobile', sa.String(32), nullable=True))
    op.create_index('ix_users_mobile', 'users', ['mobile'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_mobile', table_name='users')
    op.drop_column('users', 'mobile')
