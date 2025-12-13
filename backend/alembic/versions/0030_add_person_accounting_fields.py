"""
Add accounting fields to persons

Revision ID: 0030_add_person_accounting_fields
Revises: 0029
Create Date: 2025-12-07
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0030_add_person_accounting_fields'
down_revision = '0029'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('persons') as batch_op:
        batch_op.add_column(sa.Column('tax_id', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('national_id', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('address', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('payment_terms', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('credit_limit', sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table('persons') as batch_op:
        batch_op.drop_column('credit_limit')
        batch_op.drop_column('payment_terms')
        batch_op.drop_column('address')
        batch_op.drop_column('national_id')
        batch_op.drop_column('tax_id')
