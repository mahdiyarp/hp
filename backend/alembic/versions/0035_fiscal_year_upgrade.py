"""upgrade financial years with status/is_current/lock metadata

Revision ID: 0035
Revises: 0034_token_ledger
Create Date: 2025-11-23 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0035'
down_revision = '0034_token_ledger'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('financial_years', sa.Column('status', sa.String(length=16), nullable=False, server_default='open'))
    op.add_column('financial_years', sa.Column('is_current', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('financial_years', sa.Column('locked_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('financial_years', sa.Column('closed_by', sa.String(length=128), nullable=True))
    try:
        op.alter_column('financial_years', 'start_date', type_=sa.Date())
        op.alter_column('financial_years', 'end_date', type_=sa.Date())
    except Exception:
        pass


def downgrade():
    try:
        op.alter_column('financial_years', 'start_date', type_=sa.DateTime(timezone=True))
        op.alter_column('financial_years', 'end_date', type_=sa.DateTime(timezone=True))
    except Exception:
        pass
    op.drop_column('financial_years', 'closed_by')
    op.drop_column('financial_years', 'locked_at')
    op.drop_column('financial_years', 'is_current')
    op.drop_column('financial_years', 'status')
