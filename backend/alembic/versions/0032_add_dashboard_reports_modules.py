"""Add dashboard and reports module permissions.

Revision ID: 0032
Revises: 0031
Create Date: 2025-11-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0032'
down_revision = '0031'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add dashboard and reports permissions, and assign to all roles."""
    # Create dashboard module permissions
    op.execute("""
        INSERT INTO permissions (name, description, module, created_at)
        VALUES 
            ('dashboard_view', 'مشاهده داشبورد', 'dashboard', now()),
            ('dashboard_customize', 'سفارشی‌سازی داشبورد', 'dashboard', now()),
            ('reports_view', 'مشاهده گزارش‌ها', 'reports', now()),
            ('reports_export', 'صادرات گزارش‌ها', 'reports', now())
        ON CONFLICT DO NOTHING;
    """)
    
    # Assign all dashboard and reports permissions to all roles
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p
        WHERE p.module IN ('dashboard', 'reports')
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions 
            WHERE role_id = r.id AND permission_id = p.id
        );
    """)


def downgrade() -> None:
    """Remove dashboard and reports permissions and assignments."""
    # Remove role_permissions entries
    op.execute("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE module IN ('dashboard', 'reports')
        );
    """)
    
    # Remove permissions
    op.execute("""
        DELETE FROM permissions WHERE module IN ('dashboard', 'reports');
    """)
