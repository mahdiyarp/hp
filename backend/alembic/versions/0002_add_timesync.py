"""add timesync table

Revision ID: 0002_add_timesync
Revises: 0001_initial
Create Date: 2025-11-08 00:10:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0002_add_timesync'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'time_syncs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('client_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('server_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table('time_syncs')
