"""add optional fields to persons

Revision ID: 0035_person_optional_fields
Revises: 0034_merge_all_heads
Create Date: 2025-12-10
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = '0035_person_optional_fields'
down_revision = '0034_merge_all_heads'
branch_labels = None
depends_on = None


def upgrade():
    # Use Postgres IF NOT EXISTS to avoid errors on existing columns
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS national_id VARCHAR(64)")
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS address TEXT")
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS payment_terms TEXT")
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS credit_limit INTEGER")


def downgrade():
    # Keep data; safe no-op or drop columns if desired
    try:
        op.execute("ALTER TABLE persons DROP COLUMN IF EXISTS credit_limit")
        op.execute("ALTER TABLE persons DROP COLUMN IF EXISTS payment_terms")
        op.execute("ALTER TABLE persons DROP COLUMN IF EXISTS address")
        op.execute("ALTER TABLE persons DROP COLUMN IF EXISTS national_id")
    except Exception:
        pass
