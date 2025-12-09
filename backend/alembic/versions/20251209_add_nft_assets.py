"""add nft_assets table

Revision ID: 20251209_add_nft_assets
Revises: 20251208_add_search_indexes
Create Date: 2025-12-09

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251209_add_nft_assets'
down_revision = '20251208_add_search_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'nft_assets',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('token_id', sa.String(length=128), nullable=False),
        sa.Column('chain', sa.String(length=64), nullable=False, server_default=sa.text("'hesabpak'")),
        sa.Column('contract_address', sa.String(length=128), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('owner_user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    )
    op.create_index('ix_nft_assets_token_id', 'nft_assets', ['token_id'], unique=True)
    op.create_index('ix_nft_assets_owner_user_id', 'nft_assets', ['owner_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_nft_assets_owner_user_id', table_name='nft_assets')
    op.drop_index('ix_nft_assets_token_id', table_name='nft_assets')
    op.drop_table('nft_assets')
