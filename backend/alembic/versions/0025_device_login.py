"""add device login tracking

Revision ID: 0025_device_login
Revises: 0024_user_preferences
Create Date: 2025-11-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0025_device_login'
down_revision = '0024_user_preferences'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'device_logins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('device_id', sa.String(128), nullable=False),  # UA fingerprint hash
        sa.Column('ip_address', sa.String(45), nullable=True),  # IPv4 or IPv6
        sa.Column('user_agent', sa.String(512), nullable=True),
        sa.Column('country', sa.String(2), nullable=True),  # ISO country code
        sa.Column('city', sa.String(128), nullable=True),
        sa.Column('login_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('logout_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('otp_attempts', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('otp_failed_count', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('otp_locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_device_logins_user_id'), 'device_logins', ['user_id'])
    op.create_index(op.f('ix_device_logins_device_id'), 'device_logins', ['device_id'])
    op.create_index(op.f('ix_device_logins_ip_address'), 'device_logins', ['ip_address'])


def downgrade() -> None:
    op.drop_index(op.f('ix_device_logins_ip_address'), table_name='device_logins')
    op.drop_index(op.f('ix_device_logins_device_id'), table_name='device_logins')
    op.drop_index(op.f('ix_device_logins_user_id'), table_name='device_logins')
    op.drop_table('device_logins')

