"""Mark disposable demo accounts.

Revision ID: 0042_demo_account
Revises: 0041_add_role_fields
"""
from alembic import op
import sqlalchemy as sa

revision = "0042_demo_account"
down_revision = "0041_add_role_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_users_is_demo", "users", ["is_demo"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_is_demo", table_name="users")
    op.drop_column("users", "is_demo")
