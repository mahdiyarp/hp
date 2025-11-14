"""create ledger_entries table

Revision ID: 0007
Revises: 0006
Create Date: 2025-11-08 02:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'ledger_entries',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('ref_type', sa.String(length=64), nullable=True),
        sa.Column('ref_id', sa.String(length=128), nullable=True),
        sa.Column('entry_date', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('debit_account', sa.String(length=128), nullable=False),
        sa.Column('credit_account', sa.String(length=128), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('party_id', sa.String(length=128), nullable=True),
        sa.Column('party_name', sa.String(length=512), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('ledger_entries')
