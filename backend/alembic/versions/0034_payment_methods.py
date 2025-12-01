"""
add payment_methods table and seed defaults

Revision ID: 0034_payment_methods
Revises: 0033_sms_config_migration
Create Date: 2025-12-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String, Integer, Boolean, Text

# revision identifiers, used by Alembic.
revision = '0034_payment_methods'
down_revision = '0033_sms_config_migration'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'payment_methods',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('key', sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('parent_id', sa.Integer(), sa.ForeignKey('payment_methods.id'), nullable=True, index=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('account', sa.String(length=128), nullable=True),
        sa.Column('is_cheque', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('config', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Seed default methods compatible with existing values in payments.method
    pm_table = table('payment_methods',
        column('key', String),
        column('name', String),
        column('parent_id', Integer),
        column('enabled', Boolean),
        column('order', Integer),
        column('account', String),
        column('is_cheque', Boolean),
        column('config', Text),
    )
    op.bulk_insert(pm_table, [
        {'key': 'cash', 'name': 'نقدی', 'parent_id': None, 'enabled': True, 'order': 0, 'account': 'Cash', 'is_cheque': False, 'config': None},
        {'key': 'bank', 'name': 'بانکی', 'parent_id': None, 'enabled': True, 'order': 1, 'account': 'Bank', 'is_cheque': False, 'config': None},
        {'key': 'pos', 'name': 'کارت‌خوان', 'parent_id': None, 'enabled': True, 'order': 2, 'account': 'POS', 'is_cheque': False, 'config': None},
        {'key': 'cheque', 'name': 'چک', 'parent_id': None, 'enabled': True, 'order': 3, 'account': 'Cheque', 'is_cheque': True, 'config': None},
        {'key': 'other', 'name': 'سایر', 'parent_id': None, 'enabled': True, 'order': 9, 'account': 'Cash', 'is_cheque': False, 'config': None},
    ])


def downgrade():
    op.drop_table('payment_methods')
