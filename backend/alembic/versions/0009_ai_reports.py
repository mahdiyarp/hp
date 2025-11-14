"""create ai_reports table

Revision ID: 0009
Revises: 0008
Create Date: 2025-11-08 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ai_reports',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('report_date', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('findings', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('reviewed_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_table('ai_reports')
