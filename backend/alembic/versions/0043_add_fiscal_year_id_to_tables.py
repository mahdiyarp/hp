"""add_fiscal_year_id_to_tables

Revision ID: 0043
Revises: 0042
Create Date: 2025-12-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0043'
down_revision = '0042'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('invoices', sa.Column('fiscal_year_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_invoices_fiscal_year_id', 'invoices', 'financial_years', ['fiscal_year_id'], ['id'])
    op.add_column('payments', sa.Column('fiscal_year_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_payments_fiscal_year_id', 'payments', 'financial_years', ['fiscal_year_id'], ['id'])
    op.add_column('ledger_entries', sa.Column('fiscal_year_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_ledger_entries_fiscal_year_id', 'ledger_entries', 'financial_years', ['fiscal_year_id'], ['id'])
    op.add_column('sale_orders', sa.Column('fiscal_year_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_sale_orders_fiscal_year_id', 'sale_orders', 'financial_years', ['fiscal_year_id'], ['id'])


def downgrade():
    op.drop_constraint('fk_sale_orders_fiscal_year_id', 'sale_orders', type_='foreignkey')
    op.drop_column('sale_orders', 'fiscal_year_id')
    op.drop_constraint('fk_ledger_entries_fiscal_year_id', 'ledger_entries', type_='foreignkey')
    op.drop_column('ledger_entries', 'fiscal_year_id')
    op.drop_constraint('fk_payments_fiscal_year_id', 'payments', type_='foreignkey')
    op.drop_column('payments', 'fiscal_year_id')
    op.drop_constraint('fk_invoices_fiscal_year_id', 'invoices', type_='foreignkey')
    op.drop_column('invoices', 'fiscal_year_id')
