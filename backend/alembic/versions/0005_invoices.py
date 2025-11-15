"""create invoices and invoice_items

Revision ID: 0005
Revises: 0004
Create Date: 2025-11-08 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('invoice_number', sa.String(length=64), nullable=True),
        sa.Column('invoice_type', sa.String(length=32), nullable=False),
        sa.Column('mode', sa.String(length=32), nullable=False, server_default='manual'),
        sa.Column('party_id', sa.String(length=128), nullable=True),
        sa.Column('party_name', sa.String(length=512), nullable=True),
        sa.Column('client_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('server_time', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='draft'),
        sa.Column('subtotal', sa.Integer(), nullable=True),
        sa.Column('tax', sa.Integer(), nullable=True),
        sa.Column('total', sa.Integer(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
    )

    op.create_table(
        'invoice_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id'), nullable=False),
        sa.Column('description', sa.String(length=1024), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit', sa.String(length=64), nullable=True),
        sa.Column('unit_price', sa.Integer(), nullable=False),
        sa.Column('total', sa.Integer(), nullable=False),
    )


def downgrade():
    op.drop_table('invoice_items')
    op.drop_table('invoices')
