"""add backups and financial years

Revision ID: 0013_add_backups_financial_years
Revises: 0012_shared_files
Create Date: 2025-11-08 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0013_add_backups_financial_years'
down_revision = '0012_shared_files'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'backups',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('filename', sa.String(length=1024), nullable=False),
        sa.Column('file_path', sa.String(length=2048), nullable=False),
        sa.Column('kind', sa.String(length=32), nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=True),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('metadata', sa.Text(), nullable=True),
    )

    op.create_table(
        'financial_years',
        sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False, unique=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_closed', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('opening_balances', sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_table('financial_years')
    op.drop_table('backups')
