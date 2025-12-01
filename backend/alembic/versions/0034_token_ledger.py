"""add token ledger and lightweight blockchain tables

Revision ID: 0034_token_ledger
Revises: 0033_sms_config_migration
Create Date: 2025-11-22
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0034_token_ledger'
down_revision = '0033'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'token_accounts',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True, unique=True),
        sa.Column('address', sa.String(length=128), nullable=False, unique=True, index=True),
        sa.Column('balance', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('locked', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('nonce', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        'blockchain_blocks',
        sa.Column('height', sa.Integer(), primary_key=True, index=True, autoincrement=True),
        sa.Column('hash', sa.String(length=128), nullable=False, unique=True, index=True),
        sa.Column('previous_hash', sa.String(length=128), nullable=True, index=True),
        sa.Column('merkle_root', sa.String(length=128), nullable=True),
        sa.Column('proposer', sa.String(length=128), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'token_transactions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('tx_hash', sa.String(length=128), nullable=False, unique=True, index=True),
        sa.Column('from_address', sa.String(length=128), nullable=True, index=True),
        sa.Column('to_address', sa.String(length=128), nullable=False, index=True),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('fee_amount', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('memo', sa.String(length=256), nullable=True),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='confirmed'),
        sa.Column('block_height', sa.Integer(), sa.ForeignKey('blockchain_blocks.height', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'nodes',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('node_id', sa.String(length=128), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(length=128), nullable=True),
        sa.Column('pubkey', sa.String(length=256), nullable=True),
        sa.Column('stake', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reputation', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='validator'),  # validator, full, light
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'consumption_logs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('service_type', sa.String(length=64), nullable=False, index=True),  # sms, ai, storage, etc
        sa.Column('ref_id', sa.String(length=128), nullable=True, index=True),
        sa.Column('cost_token', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('metadata_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table('consumption_logs')
    op.drop_table('nodes')
    op.drop_table('token_transactions')
    op.drop_table('blockchain_blocks')
    op.drop_table('token_accounts')
