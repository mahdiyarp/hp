"""Sync SMS delivery reports from IPPanel Edge and update SmsLog."""
import os
from datetime import datetime
from app import db
from app.settings.models import SmsLog
import requests


def main():
    session = db.SessionLocal()
    try:
        api_key = os.getenv("IPPANEL_API_KEY")
        base_url = os.getenv("IPPANEL_BASE_URL", "https://edge.ippanel.com/v1").rstrip("/")
        if not api_key:
            print("IPPANEL_API_KEY not set; skipping sync.")
            return
        headers = {"Authorization": api_key}
        url = base_url + "/sms/logs"  # Placeholder; adjust to real reports endpoint.
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code != 200:
            print(f"Failed to fetch reports: {resp.status_code}")
            return
        data = resp.json()
        # Expecting list of {message_id,status,delivered_at}
        for item in data if isinstance(data, list) else data.get("data", []):
            mid = item.get("message_id")
            status = item.get("status")
            delivered = item.get("delivered_at")
            if not mid:
                continue
            log = session.query(SmsLog).filter(SmsLog.provider_message_id == mid).first()
            if not log:
                continue
            if status:
                log.status = status
            if delivered:
                try:
                    log.delivered_at = datetime.fromisoformat(delivered)
                except Exception:
                    pass
            session.add(log)
        session.commit()
    finally:
        try:
            session.close()
        except Exception:
            pass


if __name__ == "__main__":
    main()
