"""add developer api keys table

Revision ID: 0026_developer_api_keys
Revises: 0025_device_login
Create Date: 2025-11-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0026_developer_api_keys'
down_revision = '0025_device_login'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'developer_api_keys',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('api_key', sa.String(512), nullable=False),  # encrypted and unique
        sa.Column('api_key_hash', sa.String(64), nullable=False, unique=True),  # SHA256 for lookup
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('rate_limit_per_minute', sa.Integer(), nullable=False, server_default=sa.text('60')),
        sa.Column('endpoints', sa.Text(), nullable=True),  # JSON: list of allowed endpoints
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_developer_api_keys_user_id'), 'developer_api_keys', ['user_id'])
    op.create_index(op.f('ix_developer_api_keys_api_key_hash'), 'developer_api_keys', ['api_key_hash'], unique=True)
    op.create_index(op.f('ix_developer_api_keys_enabled'), 'developer_api_keys', ['enabled'])


def downgrade() -> None:
    op.drop_index(op.f('ix_developer_api_keys_enabled'), table_name='developer_api_keys')
    op.drop_index(op.f('ix_developer_api_keys_api_key_hash'), table_name='developer_api_keys')
    op.drop_index(op.f('ix_developer_api_keys_user_id'), table_name='developer_api_keys')
    op.drop_table('developer_api_keys')

