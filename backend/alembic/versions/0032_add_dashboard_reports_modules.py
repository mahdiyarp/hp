"""Add dashboard and reports module permissions.

Revision ID: 0032
Revises: 0031
Create Date: 2025-11-15
"""

from alembic import op
import sqlalchemy as sa

revision = '0032'
down_revision = '0031'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Seed dashboard + reports permissions
    op.execute(
        """
        INSERT INTO permissions (name, description, module)
        VALUES 
            ('dashboard_view', 'Dashboard view permission', 'dashboard'),
            ('dashboard_customize', 'Dashboard customize permission', 'dashboard'),
            ('reports_view', 'Reports view permission', 'reports'),
            ('reports_export', 'Reports export permission', 'reports')
        ON CONFLICT (name) DO NOTHING;
        """
    )

    # Grant these permissions to all existing roles
    op.execute(
        """
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id
        FROM roles r
        JOIN permissions p ON p.name IN (
            'dashboard_view','dashboard_customize','reports_view','reports_export'
        )
        WHERE NOT EXISTS (
            SELECT 1 FROM role_permissions rp
            WHERE rp.role_id = r.id AND rp.permission_id = p.id
        );
        """
    )


def downgrade() -> None:
    # Remove assignments first
    op.execute(
        """
        DELETE FROM role_permissions
        WHERE permission_id IN (
            SELECT id FROM permissions 
            WHERE name IN ('dashboard_view','dashboard_customize','reports_view','reports_export')
        );
        """
    )
    # Remove permissions
    op.execute(
        """
        DELETE FROM permissions 
        WHERE name IN ('dashboard_view','dashboard_customize','reports_view','reports_export');
        """
    )
