"""add_product_id_to_invoice_items

Revision ID: 0019_product_id
Revises: 0018_add_tracking_code
Create Date: 2025-11-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0019_product_id'
down_revision = '0018_add_tracking_code'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add product_id column to invoice_items
    op.add_column('invoice_items', sa.Column('product_id', sa.String(128), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_invoice_items_product_id',
        'invoice_items',
        'products',
        ['product_id'],
        ['id']
    )


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_invoice_items_product_id', 'invoice_items', type_='foreignkey')
    
    # Remove column
    op.drop_column('invoice_items', 'product_id')
