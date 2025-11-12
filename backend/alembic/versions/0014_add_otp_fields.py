"""add otp fields to users

Revision ID: 0014_add_otp_fields
Revises: 0013_add_backups_financial_years
Create Date: 2025-11-09 03:28:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0014_add_otp_fields'
down_revision = '0013_add_backups_financial_years'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('otp_secret', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('otp_enabled', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.execute("UPDATE users SET otp_enabled = false WHERE otp_enabled IS NULL")
    op.alter_column('users', 'otp_enabled', server_default=None)


def downgrade():
    op.drop_column('users', 'otp_enabled')
    op.drop_column('users', 'otp_secret')
