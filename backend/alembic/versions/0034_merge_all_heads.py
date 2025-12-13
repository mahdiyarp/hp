"""Merge all current heads into a single lineage

Revision ID: 0034_merge_all_heads
Revises: 0033_sms_config_migration, 20251208_person_optional_fields, 20251209_add_nft_assets
Create Date: 2025-12-09

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0034_merge_all_heads'
down_revision = (
    '0033_sms_config_migration',
    '20251208_person_optional_fields',
    '20251209_add_nft_assets',
)
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Merge revision; no schema changes.
    pass


def downgrade() -> None:
    # Merge revisions typically don’t have downgrade logic.
    pass
