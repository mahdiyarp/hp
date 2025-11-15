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
        ON CONFLICT (id) DO NOTHING;
    """)
    
    # Get the permission IDs
    op.execute("""
        WITH new_perms AS (
            SELECT id FROM permissions 
            WHERE module IN ('dashboard', 'reports') 
            AND created_at > now() - interval '1 minute'
        ),
        all_roles AS (
            SELECT id FROM roles
        )
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM all_roles r, new_perms p
        ON CONFLICT (role_id, permission_id) DO NOTHING;
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
