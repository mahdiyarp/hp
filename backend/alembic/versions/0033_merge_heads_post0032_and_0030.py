"""Merge heads after dashboard and system_settings

Revision ID: 0033_merge_heads
Revises: 0032_add_dashboard_reports_modules, 0030
Create Date: 2025-12-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0033_merge_heads'
down_revision = ('0032_add_dashboard_reports_modules', '0030')
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a merge revision; no schema changes required.
    pass


def downgrade() -> None:
    # Merge revisions typically don't have downgrade logic.
    pass
