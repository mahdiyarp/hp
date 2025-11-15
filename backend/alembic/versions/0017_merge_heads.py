"""merge ledger and master data/payment fk heads

Revision ID: 0017
Revises: 0007, 0016
Create Date: 2025-11-14 00:10:00.000000
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '0017'
down_revision = ('0007', '0016')
branch_labels = None
depends_on = None
branch_labels = None
depends_on = None

def upgrade():
    # merge revision - no op
    pass

def downgrade():
    # cannot easily unmerge; left empty intentionally
    pass
