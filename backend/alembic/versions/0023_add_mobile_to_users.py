"""add mobile to users table

Revision ID: 0023
Revises: 0022
Create Date: 2025-11-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0023_add_mobile_to_users'
down_revision = '0022_user_sms_config'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('mobile', sa.String(32), nullable=True))
    op.create_index('ix_users_mobile', 'users', ['mobile'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_mobile', table_name='users')
    op.drop_column('users', 'mobile')
