"""merge ledger and master data/payment fk heads

Revision ID: 0017_merge_heads
Revises: 0007_ledger, 0016_add_invoice_fk_to_payments
Create Date: 2025-11-14 00:10:00.000000
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '0017_merge_heads'
down_revision = ('0007_ledger', '0016_add_invoice_fk_to_payments')
branch_labels = None
depends_on = None

def upgrade():
    # merge revision - no op
    pass

def downgrade():
    # cannot easily unmerge; left empty intentionally
    pass
