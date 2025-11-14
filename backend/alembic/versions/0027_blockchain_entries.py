"""add blockchain entries for immutable audit trail

Revision ID: 0027_blockchain_entries
Revises: 0026_developer_api_keys
Create Date: 2025-11-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0027_blockchain_entries'
down_revision = '0026_developer_api_keys'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'blockchain_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(64), nullable=False),  # user, invoice, payment, product, person
        sa.Column('entity_id', sa.String(128), nullable=False),
        sa.Column('action', sa.String(32), nullable=False),  # create, update, delete
        sa.Column('data_hash', sa.String(64), nullable=False),  # SHA256 of entity data
        sa.Column('previous_hash', sa.String(64), nullable=True),  # Link to previous entry
        sa.Column('merkle_root', sa.String(64), nullable=True),  # Merkle tree root
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_blockchain_entries_entity_type'), 'blockchain_entries', ['entity_type'])
    op.create_index(op.f('ix_blockchain_entries_entity_id'), 'blockchain_entries', ['entity_id'])
    op.create_index(op.f('ix_blockchain_entries_data_hash'), 'blockchain_entries', ['data_hash'], unique=True)
    op.create_index(op.f('ix_blockchain_entries_timestamp'), 'blockchain_entries', ['timestamp'])
    op.create_index(op.f('ix_blockchain_entries_user_id'), 'blockchain_entries', ['user_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_blockchain_entries_user_id'), table_name='blockchain_entries')
    op.drop_index(op.f('ix_blockchain_entries_timestamp'), table_name='blockchain_entries')
    op.drop_index(op.f('ix_blockchain_entries_data_hash'), table_name='blockchain_entries')
    op.drop_index(op.f('ix_blockchain_entries_entity_id'), table_name='blockchain_entries')
    op.drop_index(op.f('ix_blockchain_entries_entity_type'), table_name='blockchain_entries')
    op.drop_table('blockchain_entries')

