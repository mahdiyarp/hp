"""add user preferences for language and currency

Revision ID: 0024_user_preferences
Revises: 0023_add_mobile_to_users
Create Date: 2025-11-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '0024_user_preferences'
down_revision = '0023_add_mobile_to_users'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('language', sa.String(5), nullable=False, server_default='fa'),  # fa, en, ar, ku
        sa.Column('currency', sa.String(3), nullable=False, server_default='irr'),  # irr, usd, aed
        sa.Column('auto_convert_currency', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('theme_preference', sa.String(50), nullable=True, server_default='default'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )
    op.create_index(op.f('ix_user_preferences_user_id'), 'user_preferences', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_user_preferences_user_id'), table_name='user_preferences')
    op.drop_table('user_preferences')

