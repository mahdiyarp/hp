"""add indexes for sms_events

Revision ID: 20251211_add_sms_indexes
Revises: 20251211_add_sms_events
Create Date: 2025-12-11

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251211_add_sms_indexes'
down_revision = '20251211_add_sms_events'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index('ix_sms_events_status_created_at', 'sms_events', ['status', 'created_at'])
    op.create_index('ix_sms_events_recipient', 'sms_events', ['recipient'])
    op.create_index('ix_sms_events_provider', 'sms_events', ['provider'])


def downgrade():
    op.drop_index('ix_sms_events_provider', table_name='sms_events')
    op.drop_index('ix_sms_events_recipient', table_name='sms_events')
    op.drop_index('ix_sms_events_status_created_at', table_name='sms_events')