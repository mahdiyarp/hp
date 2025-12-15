"""
Add optional person fields if missing

Revision ID: 20251208_person_optional_fields
Revises: 
Create Date: 2025-12-08
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251208_person_optional_fields'
down_revision = '0033_merge_heads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    try:
        existing = {c['name'] for c in insp.get_columns('persons')}
    except Exception:
        existing = set()

    if 'tax_id' not in existing:
        op.add_column('persons', sa.Column('tax_id', sa.String(length=64), nullable=True))
    if 'national_id' not in existing:
        op.add_column('persons', sa.Column('national_id', sa.String(length=64), nullable=True))
    if 'address' not in existing:
        op.add_column('persons', sa.Column('address', sa.Text(), nullable=True))
    if 'payment_terms' not in existing:
        op.add_column('persons', sa.Column('payment_terms', sa.String(length=128), nullable=True))
    if 'credit_limit' not in existing:
        op.add_column('persons', sa.Column('credit_limit', sa.Integer(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    try:
        existing = {c['name'] for c in insp.get_columns('persons')}
    except Exception:
        existing = set()

    if 'credit_limit' in existing:
        op.drop_column('persons', 'credit_limit')
    if 'payment_terms' in existing:
        op.drop_column('persons', 'payment_terms')
    if 'address' in existing:
        op.drop_column('persons', 'address')
    if 'national_id' in existing:
        op.drop_column('persons', 'national_id')
    if 'tax_id' in existing:
        op.drop_column('persons', 'tax_id')
