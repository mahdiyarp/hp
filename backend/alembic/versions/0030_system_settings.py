"""Add System Settings table for global API configurations

Revision ID: 0030
Revises: 0029
Create Date: 2025-11-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0030'
down_revision = '0029'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent creation: only create table/index if not already present
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    tables = inspector.get_table_names()
    if 'system_settings' not in tables:
        op.create_table(
            'system_settings',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('key', sa.String(128), nullable=False, unique=True, index=True),
            sa.Column('value', sa.Text(), nullable=True),  # JSON for complex values
            sa.Column('setting_type', sa.String(32), nullable=False, default='string'),  # string, json, int, bool
            sa.Column('display_name', sa.String(255), nullable=True),  # Label for admin UI
            sa.Column('description', sa.Text(), nullable=True),  # Help text
            sa.Column('category', sa.String(64), nullable=True, index=True),  # sms, email, payment, etc.
            sa.Column('is_secret', sa.Boolean(), nullable=False, default=False),  # Hide sensitive values in UI
            sa.Column('updated_by', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL')
        )

    # Create index if missing
    existing_indexes = {idx.get('name') for idx in inspector.get_indexes('system_settings')} if 'system_settings' in tables else set()
    if 'ix_system_settings_category' not in existing_indexes:
        op.create_index('ix_system_settings_category', 'system_settings', ['category'])


def downgrade() -> None:
    op.drop_index('ix_system_settings_category', table_name='system_settings')
    op.drop_table('system_settings')
