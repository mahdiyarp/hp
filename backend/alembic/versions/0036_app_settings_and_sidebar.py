"""app settings table and sidebar prefs

Revision ID: 0036
Revises: 0035
Create Date: 2025-11-23 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0036'
down_revision = '0035'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'app_settings',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('data', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )
    op.add_column('user_preferences', sa.Column('sidebar_order', sa.Text(), nullable=True))
    op.add_column('user_preferences', sa.Column('sidebar_collapsed', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade():
    op.drop_column('user_preferences', 'sidebar_collapsed')
    op.drop_column('user_preferences', 'sidebar_order')
    op.drop_table('app_settings')
