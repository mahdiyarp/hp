"""master data extensions: codes and accounts

Revision ID: 0015_master_data_accounts
Revises: 0014_add_otp_fields
Create Date: 2025-11-09 04:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0015_master_data_accounts'
down_revision = '0014_add_otp_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Products: add code + created_at
    op.add_column('products', sa.Column('code', sa.String(length=64), nullable=True))
    op.add_column('products', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))
    op.execute("UPDATE products SET code = 'PRD-' || upper(substr(id, 1, 10)) WHERE code IS NULL")
    op.alter_column('products', 'code', nullable=False)
    op.create_unique_constraint('uq_products_code', 'products', ['code'])

    # Persons: add code + created_at
    op.add_column('persons', sa.Column('code', sa.String(length=64), nullable=True))
    op.add_column('persons', sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False))
    op.execute("UPDATE persons SET code = 'PRS-' || upper(substr(id, 1, 10)) WHERE code IS NULL")
    op.alter_column('persons', 'code', nullable=False)
    op.create_unique_constraint('uq_persons_code', 'persons', ['code'])

    op.create_table(
        'accounts',
        sa.Column('id', sa.String(length=128), nullable=False),
        sa.Column('code', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('name_norm', sa.String(length=255), nullable=False),
        sa.Column('kind', sa.String(length=32), nullable=False),
        sa.Column('details', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code', name='uq_accounts_code'),
    )
    op.create_index('ix_accounts_name_norm', 'accounts', ['name_norm'])


def downgrade():
    op.drop_index('ix_accounts_name_norm', table_name='accounts')
    op.drop_table('accounts')

    op.drop_constraint('uq_persons_code', 'persons', type_='unique')
    op.drop_column('persons', 'created_at')
    op.drop_column('persons', 'code')

    op.drop_constraint('uq_products_code', 'products', type_='unique')
    op.drop_column('products', 'created_at')
    op.drop_column('products', 'code')
