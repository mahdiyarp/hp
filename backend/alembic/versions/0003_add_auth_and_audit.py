"""add auth fields and audit_logs

Revision ID: 0003
Revises: 0002
Create Date: 2025-11-08 00:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade():
    # users table previously had id and name; migrate to extended user fields
    with op.batch_alter_table('users') as batch_op:
        # add new columns
        batch_op.add_column(sa.Column('username', sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column('email', sa.String(length=254), nullable=True))
        batch_op.add_column(sa.Column('full_name', sa.String(length=254), nullable=True))
        batch_op.add_column(sa.Column('hashed_password', sa.String(length=512), nullable=True))
        batch_op.add_column(sa.Column('role', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('refresh_token_hash', sa.String(length=512), nullable=True))
        # drop old 'name' column if exists
        try:
            batch_op.drop_column('name')
        except Exception:
            pass

    # create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('path', sa.String(length=1024), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('detail', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table('audit_logs')
    with op.batch_alter_table('users') as batch_op:
        # try to restore 'name' as nullable
        batch_op.add_column(sa.Column('name', sa.String(), nullable=True))
        # drop added columns
        for col in ['username', 'email', 'full_name', 'hashed_password', 'role', 'is_active', 'refresh_token_hash']:
            try:
                batch_op.drop_column(col)
            except Exception:
                pass