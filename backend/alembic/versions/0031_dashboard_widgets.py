"""Add Dashboard Widgets configuration for customizable dashboard

Revision ID: 0031
Revises: 0030
Create Date: 2025-11-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0031'
down_revision = '0030'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create dashboard_widgets table to store user dashboard configurations
    op.create_table(
        'dashboard_widgets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('widget_type', sa.String(64), nullable=False),  # 'sales', 'invoices', 'payments', 'inventory', etc.
        sa.Column('title', sa.String(255), nullable=True),
        sa.Column('position_x', sa.Integer(), nullable=False, default=0),  # Column position (0-11 for 12-column grid)
        sa.Column('position_y', sa.Integer(), nullable=False, default=0),  # Row position
        sa.Column('width', sa.Integer(), nullable=False, default=3),  # Width in grid units (1-12)
        sa.Column('height', sa.Integer(), nullable=False, default=3),  # Height in grid units
        sa.Column('config', sa.Text(), nullable=True),  # JSON config for widget-specific settings
        sa.Column('enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('order', sa.Integer(), nullable=False, default=0),  # Display order
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id', 'widget_type', name='uq_user_widget_type')
    )
    op.create_index('ix_dashboard_widgets_user_id', 'dashboard_widgets', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_dashboard_widgets_user_id', table_name='dashboard_widgets')
    op.drop_table('dashboard_widgets')
