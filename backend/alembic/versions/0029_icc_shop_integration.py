"""Add ICC Shop Organization Structure

Revision ID: 0029
Revises: 0028
Create Date: 2025-11-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0029'
down_revision = '0028'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create icc_categories table
    op.create_table(
        'icc_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(128), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('parent_external_id', sa.String(128), nullable=True),
        sa.Column('sync_url', sa.String(512), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_id', name='uq_icc_category_external_id')
    )
    op.create_index('ix_icc_categories_external_id', 'icc_categories', ['external_id'])
    op.create_index('ix_icc_categories_parent_external_id', 'icc_categories', ['parent_external_id'])

    # Create icc_centers table
    op.create_table(
        'icc_centers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(128), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('phone', sa.String(32), nullable=True),
        sa.Column('manager_name', sa.String(255), nullable=True),
        sa.Column('location_lat', sa.String(32), nullable=True),
        sa.Column('location_lng', sa.String(32), nullable=True),
        sa.Column('sync_url', sa.String(512), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['icc_categories.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_id', name='uq_icc_center_external_id')
    )
    op.create_index('ix_icc_centers_external_id', 'icc_centers', ['external_id'])
    op.create_index('ix_icc_centers_category_id', 'icc_centers', ['category_id'])

    # Create icc_units table
    op.create_table(
        'icc_units',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(128), nullable=False),
        sa.Column('center_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('unit_type', sa.String(64), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('sync_url', sa.String(512), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['center_id'], ['icc_centers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_id', name='uq_icc_unit_external_id')
    )
    op.create_index('ix_icc_units_external_id', 'icc_units', ['external_id'])
    op.create_index('ix_icc_units_center_id', 'icc_units', ['center_id'])

    # Create icc_extensions table
    op.create_table(
        'icc_extensions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('external_id', sa.String(128), nullable=False),
        sa.Column('unit_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('responsible_name', sa.String(255), nullable=True),
        sa.Column('responsible_mobile', sa.String(32), nullable=True),
        sa.Column('status', sa.String(32), nullable=False, server_default='active'),
        sa.Column('sync_url', sa.String(512), nullable=True),
        sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['unit_id'], ['icc_units.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_id', name='uq_icc_extension_external_id')
    )
    op.create_index('ix_icc_extensions_external_id', 'icc_extensions', ['external_id'])
    op.create_index('ix_icc_extensions_unit_id', 'icc_extensions', ['unit_id'])


def downgrade() -> None:
    op.drop_index('ix_icc_extensions_unit_id', table_name='icc_extensions')
    op.drop_index('ix_icc_extensions_external_id', table_name='icc_extensions')
    op.drop_table('icc_extensions')

    op.drop_index('ix_icc_units_center_id', table_name='icc_units')
    op.drop_index('ix_icc_units_external_id', table_name='icc_units')
    op.drop_table('icc_units')

    op.drop_index('ix_icc_centers_category_id', table_name='icc_centers')
    op.drop_index('ix_icc_centers_external_id', table_name='icc_centers')
    op.drop_table('icc_centers')

    op.drop_index('ix_icc_categories_parent_external_id', table_name='icc_categories')
    op.drop_index('ix_icc_categories_external_id', table_name='icc_categories')
    op.drop_table('icc_categories')
