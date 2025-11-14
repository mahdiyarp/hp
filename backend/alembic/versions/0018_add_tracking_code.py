"""add tracking_code to invoices payments ledger_entries

Revision ID: 0018_add_tracking_code
Revises: 0017_merge_heads
Create Date: 2025-11-14 00:12:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0018_add_tracking_code'
down_revision = '0017_merge_heads'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('invoices', sa.Column('tracking_code', sa.String(length=64), nullable=True))
    op.add_column('payments', sa.Column('tracking_code', sa.String(length=64), nullable=True))
    op.add_column('ledger_entries', sa.Column('tracking_code', sa.String(length=64), nullable=True))
    op.create_index('ix_invoices_tracking_code', 'invoices', ['tracking_code'])
    op.create_index('ix_payments_tracking_code', 'payments', ['tracking_code'])
    op.create_index('ix_ledger_entries_tracking_code', 'ledger_entries', ['tracking_code'])

    # backfill existing rows with generated codes (simple)
    # For simplicity using SQL string concatenation; randomness omitted
    op.execute("UPDATE invoices SET tracking_code = 'TRC-' || id WHERE tracking_code IS NULL")
    op.execute("UPDATE payments SET tracking_code = 'TRC-' || id WHERE tracking_code IS NULL")
    op.execute("UPDATE ledger_entries SET tracking_code = 'TRC-' || id WHERE tracking_code IS NULL")


def downgrade():
    op.drop_index('ix_ledger_entries_tracking_code', table_name='ledger_entries')
    op.drop_index('ix_payments_tracking_code', table_name='payments')
    op.drop_index('ix_invoices_tracking_code', table_name='invoices')
    op.drop_column('ledger_entries', 'tracking_code')
    op.drop_column('payments', 'tracking_code')
    op.drop_column('invoices', 'tracking_code')
