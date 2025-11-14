"""create integration_configs table

Revision ID: 0010
Revises: 0009
Create Date: 2025-11-08 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'integration_configs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(length=128), nullable=False, unique=True),
        sa.Column('provider', sa.String(length=128), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('api_key', sa.String(length=512), nullable=True),
        sa.Column('config', sa.Text(), nullable=True),
        sa.Column('last_updated', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_table('integration_configs')
