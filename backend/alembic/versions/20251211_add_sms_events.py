"""add sms_events table

Revision ID: 20251211_add_sms_events
Revises: 
Create Date: 2025-12-11

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251211_add_sms_events'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'sms_events',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), nullable=True, index=True),
        sa.Column('provider', sa.String(length=50), nullable=True, index=True),
        sa.Column('recipient', sa.String(length=64), nullable=False, index=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='queued'),
        sa.Column('response_code', sa.String(length=64), nullable=True),
        sa.Column('response_message', sa.Text(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('tracking_code', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )


def downgrade():
    op.drop_table('sms_events')
