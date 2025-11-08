"""add due_date to payments

Revision ID: 0008_payments_due_date
Revises: 0006_payments
Create Date: 2025-11-08 02:20:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0008_payments_due_date'
down_revision = '0006_payments'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('payments', sa.Column('due_date', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column('payments', 'due_date')
