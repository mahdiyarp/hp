import os
from backend.app import db
from backend.app.papi import start_otp

def test_start_otp_dev_bypass_succeeds():
    # اطمینان از فعال بودن حالت توسعه/دمو
    os.environ['DEV_FEATURES_ENABLED'] = 'true'
    os.environ['DEMO_ALLOW_OTP_NO_SMS'] = 'true'
    s = db.SessionLocal()
    try:
        ok, info = start_otp(s, '09123456789')
        assert ok is True
        assert isinstance(info, str) and len(info) > 0
    finally:
        try:
            s.close()
        except Exception:
            pass