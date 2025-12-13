"""add useful search indexes

Revision ID: 20251208_add_search_indexes
Revises: 
Create Date: 2025-12-08
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251208_add_search_indexes'
down_revision = '0033_merge_heads'
branch_labels = None
depends_on = None


def upgrade():
    try:
        op.create_index('ix_persons_mobile', 'persons', ['mobile'], unique=False)
    except Exception:
        pass
    try:
        op.create_index('ix_invoices_party_name', 'invoices', ['party_name'], unique=False)
    except Exception:
        pass
    try:
        op.create_index('ix_payments_party_name', 'payments', ['party_name'], unique=False)
    except Exception:
        pass
    try:
        op.create_index('ix_price_histories_product_effective', 'price_histories', ['product_id', 'effective_at'], unique=False)
    except Exception:
        pass


def downgrade():
    try:
        op.drop_index('ix_price_histories_product_effective', table_name='price_histories')
    except Exception:
        pass
    try:
        op.drop_index('ix_payments_party_name', table_name='payments')
    except Exception:
        pass
    try:
        op.drop_index('ix_invoices_party_name', table_name='invoices')
    except Exception:
        pass
    try:
        op.drop_index('ix_persons_mobile', table_name='persons')
    except Exception:
        pass
