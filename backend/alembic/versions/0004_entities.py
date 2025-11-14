"""create products, price_histories, persons

Revision ID: 0004
Revises: 0003
Create Date: 2025-11-08 00:45:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'products',
        sa.Column('id', sa.String(length=128), primary_key=True),
        sa.Column('name', sa.String(length=512), nullable=False),
        sa.Column('name_norm', sa.String(length=512), nullable=False),
        sa.Column('unit', sa.String(length=64), nullable=True),
        sa.Column('group', sa.String(length=128), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('inventory', sa.Integer(), nullable=True, server_default='0'),
    )

    op.create_table(
        'price_histories',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('product_id', sa.String(length=128), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('price', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=16), nullable=False),
        sa.Column('effective_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'persons',
        sa.Column('id', sa.String(length=128), primary_key=True),
        sa.Column('name', sa.String(length=512), nullable=False),
        sa.Column('name_norm', sa.String(length=512), nullable=False),
        sa.Column('kind', sa.String(length=32), nullable=True),
        sa.Column('mobile', sa.String(length=32), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('persons')
    op.drop_table('price_histories')
    op.drop_table('products')
