"""sms module tables

Revision ID: 0037
Revises: 0036
Create Date: 2025-11-23 02:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0037'
down_revision = '0036'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'sms_settings',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False, server_default='ippanel'),
        sa.Column('base_url', sa.String(length=256), nullable=False, server_default='https://edge.ippanel.com/v1'),
        sa.Column('api_key_masked', sa.String(length=256), nullable=True),
        sa.Column('default_sender', sa.String(length=64), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('low_credit_threshold', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_table(
        'sms_templates',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('code', sa.String(length=64), nullable=False, unique=True),
        sa.Column('pattern_id', sa.String(length=128), nullable=True),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.create_table(
        'sms_logs',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('event_code', sa.String(length=64), nullable=True),
        sa.Column('recipient', sa.String(length=32), nullable=False),
        sa.Column('body_preview', sa.Text(), nullable=True),
        sa.Column('provider_message_id', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='queued'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('meta', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_table('sms_logs')
    op.drop_table('sms_templates')
    op.drop_table('sms_settings')
