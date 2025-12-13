"""SMS API کنفیگریشن - iPanel کے ساتھ

Revision ID: 0033_sms_config_migration
Revises: 0032_add_dashboard_reports_modules
Create Date: 2025-11-15

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0033_sms_config_migration'
down_revision = '0032_add_dashboard_reports_modules'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """SMS کنفیگریشن شامل کریں"""
    
    # SMS API key اور settings شامل کریں
    op.execute("""
        INSERT INTO system_settings (key, value, category, description, is_secret, created_at)
        VALUES 
            ('sms_provider', 'ippanel', 'sms', 'SMS فراہم کنندہ (ippanel)', false, now()),
            ('sms_api_key', 'YTA1YmE4NDAtOTc4Ny00YTUzLTlhZmQtMmM0Mzg3ODFhNzZkZDRkNDEwNTRkNjY2MzY1MDU3OTg4YmZhNWI3MjkzN2Y=', 'sms', 'iPanel API کلید', true, now()),
            ('sms_sender', '', 'sms', 'SMS بھیجنے والا نمبر (اختیاری)', false, now())
        ON CONFLICT (key) DO NOTHING;
    """)


def downgrade() -> None:
    """SMS کنفیگریشن ہٹائیں"""
    op.execute("""
        DELETE FROM system_settings 
        WHERE category = 'sms';
    """)
