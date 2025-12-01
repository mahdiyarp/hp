"""Invoice module overhaul: discounts, tax rates, attachments.

Revision ID: 0039_invoice_overhaul
Revises: 0038_smart_assistant
Create Date: 2025-11-23
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '0039_invoice_overhaul'
down_revision = '0038_smart_assistant'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)

    def has_column(table: str, column: str) -> bool:
        return column in [col['name'] for col in inspector.get_columns(table)]

    if not has_column('invoices', 'tax_rate'):
        op.add_column('invoices', sa.Column('tax_rate', sa.Float(), nullable=True, server_default='0'))
    if not has_column('invoices', 'discount_total'):
        op.add_column('invoices', sa.Column('discount_total', sa.Integer(), nullable=True, server_default='0'))
    if not has_column('invoices', 'due_date'):
        op.add_column('invoices', sa.Column('due_date', sa.DateTime(timezone=True), nullable=True))
    if not has_column('invoices', 'currency'):
        op.add_column('invoices', sa.Column('currency', sa.String(length=16), nullable=True, server_default='IRR'))
    if not has_column('invoices', 'payment_terms_days'):
        op.add_column('invoices', sa.Column('payment_terms_days', sa.Integer(), nullable=True))
    if not has_column('invoice_items', 'discount'):
        op.add_column('invoice_items', sa.Column('discount', sa.Integer(), nullable=True, server_default='0'))

    if 'invoice_attachments' not in inspector.get_table_names():
        op.create_table(
            'invoice_attachments',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id'), nullable=False, index=True),
            sa.Column('filename', sa.String(length=256), nullable=False),
            sa.Column('content_type', sa.String(length=128), nullable=True),
            sa.Column('path', sa.String(length=512), nullable=True),
            sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )


def downgrade():
    op.drop_table('invoice_attachments')
    op.drop_column('invoice_items', 'discount')
    op.drop_column('invoices', 'payment_terms_days')
    op.drop_column('invoices', 'currency')
    op.drop_column('invoices', 'due_date')
    op.drop_column('invoices', 'discount_total')
    op.drop_column('invoices', 'tax_rate')
