"""add assistant_enabled to users

Revision ID: 0011_user_assistant_flag
Revises: 0010_integration_configs
Create Date: 2025-11-08 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0011_user_assistant_flag'
down_revision = '0010_integration_configs'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('assistant_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade():
    op.drop_column('users', 'assistant_enabled')
