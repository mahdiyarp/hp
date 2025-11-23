"""smart assistant tables

Revision ID: 0038
Revises: 0037
Create Date: 2025-11-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0038'
down_revision = '0037'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'smart_assistant_settings',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=False, server_default='openai'),
        sa.Column('base_url', sa.String(length=256), nullable=True),
        sa.Column('api_key_masked', sa.String(length=256), nullable=True),
        sa.Column('model_name', sa.String(length=128), nullable=True, server_default='gpt-4.1'),
        sa.Column('language', sa.String(length=8), nullable=False, server_default='fa'),
        sa.Column('enable_doc_understanding', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('enable_journal_suggestions', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('enable_alerts', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('max_tokens', sa.Integer(), nullable=True),
        sa.Column('temperature', sa.Integer(), nullable=True),
        sa.Column('top_p', sa.Integer(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'smart_assistant_sessions',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('title', sa.String(length=256), nullable=True),
        sa.Column('meta', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )

    op.create_table(
        'smart_assistant_messages',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('session_id', sa.Integer(), sa.ForeignKey('smart_assistant_sessions.id'), nullable=False, index=True),
        sa.Column('role', sa.String(length=16), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('meta', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade():
    op.drop_table('smart_assistant_messages')
    op.drop_table('smart_assistant_sessions')
    op.drop_table('smart_assistant_settings')
