"""Seed default roles (Admin, Manager, Viewer).

Revision ID: 0042_seed_default_roles
Revises: 0041_add_role_fields
Create Date: 2025-11-30
"""
from alembic import op

revision = '0042_seed_default_roles'
down_revision = '0041_add_role_fields'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO roles (name)
        VALUES ('Admin'), ('Manager'), ('Viewer')
        ON CONFLICT (name) DO NOTHING;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM roles WHERE name IN ('Admin','Manager','Viewer');
        """
    )
