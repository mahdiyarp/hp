"""Add roles and permissions system

Revision ID: 0020
Revises: 0019
Create Date: 2025-11-14 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0020'
down_revision = '0019'
branch_labels = None
depends_on = None


def upgrade():
    # Create roles table
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(50), nullable=False, unique=True),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create permissions table
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('module', sa.String(50), nullable=True),  # sales, finance, people, inventory, etc.
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create role_permissions junction table
    op.create_table(
        'role_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('role_id', 'permission_id', name='uq_role_permission')
    )
    
    # Add user_id and role_id columns to users table
    op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_users_role_id', 'users', 'roles', ['role_id'], ['id'])
    
    # Insert default roles
    op.execute("""
        INSERT INTO roles (name, description) VALUES
        ('Admin', 'مدیر سیستم - دسترسی کامل'),
        ('Manager', 'مدیر - دسترسی به تمام ماژول ها'),
        ('Accountant', 'حسابدار - دسترسی به مالی و گزارشات'),
        ('Salesman', 'فروشنده - دسترسی به فروش و انبار'),
        ('Viewer', 'بیننده - فقط مشاهده اطلاعات');
    """)
    
    # Insert default permissions
    op.execute("""
        INSERT INTO permissions (name, description, module) VALUES
        -- Sales module
        ('sales_view', 'مشاهده فاکتورهای فروش', 'sales'),
        ('sales_create', 'ایجاد فاکتور فروش', 'sales'),
        ('sales_edit', 'ویرایش فاکتور فروش', 'sales'),
        ('sales_delete', 'حذف فاکتور فروش', 'sales'),
        ('sales_finalize', 'تایید و نهایی کردن فاکتور', 'sales'),
        
        -- Finance module
        ('finance_view', 'مشاهده اطلاعات مالی', 'finance'),
        ('finance_create', 'ایجاد سند مالی', 'finance'),
        ('finance_edit', 'ویرایش سند مالی', 'finance'),
        ('finance_delete', 'حذف سند مالی', 'finance'),
        ('finance_report', 'دسترسی به گزارشات مالی', 'finance'),
        
        -- People module
        ('people_view', 'مشاهده مشتریان و تامین کنندگان', 'people'),
        ('people_create', 'ایجاد مشتری یا تامین کننده جدید', 'people'),
        ('people_edit', 'ویرایش اطلاعات مشتری', 'people'),
        ('people_delete', 'حذف مشتری یا تامین کننده', 'people'),
        
        -- Inventory module
        ('inventory_view', 'مشاهده موجودی', 'inventory'),
        ('inventory_create', 'ایجاد محصول جدید', 'inventory'),
        ('inventory_edit', 'ویرایش محصولات', 'inventory'),
        ('inventory_delete', 'حذف محصول', 'inventory'),
        ('inventory_adjust', 'تنظیم موجودی', 'inventory'),
        
        -- System settings
        ('settings_view', 'مشاهده تنظیمات', 'settings'),
        ('settings_edit', 'ویرایش تنظیمات', 'settings'),
        ('users_manage', 'مدیریت کاربران', 'settings'),
        ('backup_manage', 'مدیریت نسخه پشتیبان', 'settings');
    """)
    
    # Assign permissions to roles
    # Admin - all permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT 1, id FROM permissions;
    """)
    
    # Manager - all except settings
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT 2, id FROM permissions WHERE module != 'settings';
    """)
    
    # Accountant - finance, people view, inventory view
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT 3, id FROM permissions 
        WHERE module IN ('finance', 'people', 'inventory') 
        OR name IN ('sales_view', 'sales_finalize', 'inventory_view', 'inventory_adjust');
    """)
    
    # Salesman - sales, people, inventory view/create
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT 4, id FROM permissions
        WHERE module IN ('sales', 'people') 
        OR (module = 'inventory' AND name IN ('inventory_view', 'inventory_create'));
    """)
    
    # Viewer - only view permissions
    op.execute("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT 5, id FROM permissions WHERE name LIKE '%_view%';
    """)
    
    # Assign Admin role to existing admin user
    op.execute("""
        UPDATE users SET role_id = 1 WHERE username = 'admin';
    """)


def downgrade():
    op.drop_constraint('fk_users_role_id', 'users', type_='foreignkey')
    op.drop_column('users', 'role_id')
    op.drop_table('role_permissions')
    op.drop_table('permissions')
    op.drop_table('roles')
