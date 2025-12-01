"""
0036_core_crm_inventory_finance

Add CRM contacts/activities, inventory stock items/prices, and cheque tables.
"""
from alembic import op
import sqlalchemy as sa


revision = '0036'
down_revision = '0035'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'contacts',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('person_id', sa.String(length=128), nullable=False, unique=True),
        sa.Column('account_id', sa.String(length=128), nullable=True),
        sa.Column('email', sa.String(length=254), nullable=True),
        sa.Column('phone', sa.String(length=32), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=True),
        sa.Column('tags', sa.Text(), nullable=True),
        sa.Column('owner_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['person_id'], ['persons.id'], name='fk_contacts_person', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], name='fk_contacts_account'),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], name='fk_contacts_owner', ondelete='SET NULL'),
    )
    op.create_index('ix_contacts_person_id', 'contacts', ['person_id'])
    op.create_index('ix_contacts_owner_id', 'contacts', ['owner_id'])

    op.create_table(
        'crm_activities',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('contact_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('kind', sa.String(length=32), nullable=False, server_default='note'),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='open'),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['contact_id'], ['contacts.id'], name='fk_crm_activities_contact', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name='fk_crm_activities_user', ondelete='SET NULL'),
    )
    op.create_index('ix_crm_activities_contact_id', 'crm_activities', ['contact_id'])

    op.create_table(
        'product_prices',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('product_id', sa.String(length=128), nullable=False),
        sa.Column('price_type', sa.String(length=32), nullable=False, server_default='sale'),
        sa.Column('currency', sa.String(length=8), nullable=False, server_default='IRR'),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('effective_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_product_prices_product', ondelete='CASCADE'),
    )
    op.create_index('ix_product_prices_product_id', 'product_prices', ['product_id'])

    op.create_table(
        'stock_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('product_id', sa.String(length=128), nullable=False),
        sa.Column('location', sa.String(length=128), nullable=False, server_default='main'),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reserved_quantity', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('threshold', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_stock_items_product', ondelete='CASCADE'),
        sa.UniqueConstraint('product_id', 'location', name='uq_product_location'),
    )
    op.create_index('ix_stock_items_product_id', 'stock_items', ['product_id'])

    op.create_table(
        'cheques',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('payment_id', sa.Integer(), nullable=False, unique=True),
        sa.Column('cheque_number', sa.String(length=64), nullable=True),
        sa.Column('bank_name', sa.String(length=128), nullable=True),
        sa.Column('branch_name', sa.String(length=128), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending'),
        sa.Column('issue_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clearing_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], name='fk_cheques_payment', ondelete='CASCADE'),
    )
    op.create_index('ix_cheques_payment_id', 'cheques', ['payment_id'])
    op.create_index('ix_cheques_cheque_number', 'cheques', ['cheque_number'])


def downgrade() -> None:
    op.drop_index('ix_cheques_cheque_number', table_name='cheques')
    op.drop_index('ix_cheques_payment_id', table_name='cheques')
    op.drop_table('cheques')

    op.drop_index('ix_stock_items_product_id', table_name='stock_items')
    op.drop_table('stock_items')

    op.drop_index('ix_product_prices_product_id', table_name='product_prices')
    op.drop_table('product_prices')

    op.drop_index('ix_crm_activities_contact_id', table_name='crm_activities')
    op.drop_table('crm_activities')

    op.drop_index('ix_contacts_owner_id', table_name='contacts')
    op.drop_index('ix_contacts_person_id', table_name='contacts')
    op.drop_table('contacts')

