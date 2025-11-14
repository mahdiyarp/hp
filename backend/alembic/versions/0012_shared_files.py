"""create shared_files table

Revision ID: 0012
Revises: 0011
Create Date: 2025-11-08 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'shared_files',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('token', sa.String(length=128), nullable=False, unique=True),
        sa.Column('file_path', sa.String(length=1024), nullable=False),
        sa.Column('filename', sa.String(length=256), nullable=True),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_table('shared_files')
