"""
0037_sales_orders

Create sale_orders and sale_order_items tables for Sales module.
"""
from alembic import op
import sqlalchemy as sa


revision = '0037'
down_revision = '0036'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'sale_orders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_number', sa.String(length=64), nullable=True, unique=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='draft'),
        sa.Column('party_id', sa.String(length=128), nullable=True),
        sa.Column('party_name', sa.String(length=512), nullable=True),
        sa.Column('client_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('server_time', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('subtotal', sa.Integer(), nullable=True),
        sa.Column('discount', sa.Integer(), nullable=True),
        sa.Column('tax', sa.Integer(), nullable=True),
        sa.Column('shipping', sa.Integer(), nullable=True),
        sa.Column('total', sa.Integer(), nullable=True),
        sa.Column('currency', sa.String(length=8), nullable=False, server_default='IRR'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('tracking_code', sa.String(length=64), nullable=True),
        sa.Column('invoice_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['party_id'], ['persons.id'], name='fk_sale_orders_party'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], name='fk_sale_orders_invoice'),
    )
    op.create_index('ix_sale_orders_order_number', 'sale_orders', ['order_number'])
    op.create_index('ix_sale_orders_status', 'sale_orders', ['status'])
    op.create_index('ix_sale_orders_party_id', 'sale_orders', ['party_id'])
    op.create_index('ix_sale_orders_tracking_code', 'sale_orders', ['tracking_code'])

    op.create_table(
        'sale_order_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.String(length=128), nullable=True),
        sa.Column('description', sa.String(length=1024), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('unit', sa.String(length=64), nullable=True),
        sa.Column('unit_price', sa.Integer(), nullable=False),
        sa.Column('discount', sa.Integer(), nullable=True),
        sa.Column('tax_rate', sa.Integer(), nullable=True),
        sa.Column('total', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['order_id'], ['sale_orders.id'], name='fk_so_items_order', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name='fk_so_items_product'),
    )
    op.create_index('ix_sale_order_items_order_id', 'sale_order_items', ['order_id'])
    op.create_index('ix_sale_order_items_product_id', 'sale_order_items', ['product_id'])


def downgrade() -> None:
    op.drop_index('ix_sale_order_items_product_id', table_name='sale_order_items')
    op.drop_index('ix_sale_order_items_order_id', table_name='sale_order_items')
    op.drop_table('sale_order_items')

    op.drop_index('ix_sale_orders_tracking_code', table_name='sale_orders')
    op.drop_index('ix_sale_orders_party_id', table_name='sale_orders')
    op.drop_index('ix_sale_orders_status', table_name='sale_orders')
    op.drop_index('ix_sale_orders_order_number', table_name='sale_orders')
    op.drop_table('sale_orders')
