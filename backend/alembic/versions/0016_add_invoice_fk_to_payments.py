"""add invoice foreign key to payments

Revision ID: 0016
Revises: 0015
Create Date: 2025-11-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('payments', sa.Column('invoice_id', sa.Integer(), nullable=True))
    op.create_index('ix_payments_invoice_id', 'payments', ['invoice_id'])
    op.create_foreign_key('fk_payments_invoice_id', 'payments', 'invoices', ['invoice_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_payments_invoice_id', 'payments', type_='foreignkey')
    op.drop_index('ix_payments_invoice_id', table_name='payments')
    op.drop_column('payments', 'invoice_id')
