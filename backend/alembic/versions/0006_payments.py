"""create payments table

Revision ID: 0006
Revises: 0005
Create Date: 2025-11-08 01:20:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('payment_number', sa.String(length=64), nullable=True),
        sa.Column('direction', sa.String(length=16), nullable=False),
        sa.Column('mode', sa.String(length=32), nullable=False, server_default='manual'),
        sa.Column('party_id', sa.String(length=128), nullable=True),
        sa.Column('party_name', sa.String(length=512), nullable=True),
        sa.Column('method', sa.String(length=64), nullable=True),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('reference', sa.String(length=256), nullable=True),
        sa.Column('client_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('server_time', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='draft'),
        sa.Column('note', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('payments')
