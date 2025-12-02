#!/usr/bin/env python3
"""
Automated backup scheduler for HesabPak
Runs nightly database backups with 30-day retention and optional encryption
"""
import os
import time
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
import gzip
import shutil

BACKUP_DIR = Path("/app/backups")
RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
DATABASE_URL = os.getenv("DATABASE_URL", "")
BACKUP_ENCRYPTION_KEY = os.getenv("BACKUP_ENCRYPTION_KEY", "")

BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def get_db_params():
    """Parse DATABASE_URL for pg_dump"""
    # Example: postgresql+psycopg2://user:pass@host:5432/dbname
    if not DATABASE_URL:
        return None
    try:
        from urllib.parse import urlparse
        parsed = urlparse(DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://"))
        return {
            "host": parsed.hostname,
            "port": parsed.port or 5432,
            "user": parsed.username,
            "password": parsed.password,
            "dbname": parsed.path.lstrip("/"),
        }
    except Exception as e:
        print(f"Failed to parse DATABASE_URL: {e}")
        return None


def run_backup():
    """Create a compressed database backup"""
    params = get_db_params()
    if not params:
        print("No valid database connection parameters")
        return False

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"hesabpak_backup_{timestamp}.sql.gz"
    backup_path = BACKUP_DIR / backup_filename

    env = os.environ.copy()
    env["PGPASSWORD"] = params["password"]

    try:
        # Run pg_dump
        print(f"Starting backup: {backup_filename}")
        with gzip.open(backup_path, "wb") as gz_file:
            process = subprocess.Popen(
                [
                    "pg_dump",
                    "-h", params["host"],
                    "-p", str(params["port"]),
                    "-U", params["user"],
                    "-d", params["dbname"],
                    "--no-owner",
                    "--no-acl",
                ],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            stdout, stderr = process.communicate()
            if process.returncode != 0:
                print(f"pg_dump failed: {stderr.decode()}")
                return False
            gz_file.write(stdout)

        # Optional encryption
        if BACKUP_ENCRYPTION_KEY:
            encrypt_backup(backup_path)

        print(f"Backup completed: {backup_path} ({backup_path.stat().st_size / 1024:.1f} KB)")
        return True
    except Exception as e:
        print(f"Backup failed: {e}")
        return False


def encrypt_backup(backup_path: Path):
    """Encrypt backup file using Fernet (requires cryptography)"""
    try:
        from cryptography.fernet import Fernet
        fernet = Fernet(BACKUP_ENCRYPTION_KEY.encode())
        
        encrypted_path = backup_path.with_suffix(".encrypted")
        with open(backup_path, "rb") as f:
            plaintext = f.read()
        
        ciphertext = fernet.encrypt(plaintext)
        
        with open(encrypted_path, "wb") as f:
            f.write(ciphertext)
        
        # Replace original with encrypted
        os.remove(backup_path)
        encrypted_path.rename(backup_path)
        print(f"Backup encrypted: {backup_path}")
    except Exception as e:
        print(f"Encryption failed (continuing with unencrypted): {e}")


def cleanup_old_backups():
    """Remove backups older than RETENTION_DAYS"""
    cutoff = datetime.now() - timedelta(days=RETENTION_DAYS)
    removed = 0
    
    for backup_file in BACKUP_DIR.glob("hesabpak_backup_*.sql.gz"):
        try:
            file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
            if file_time < cutoff:
                backup_file.unlink()
                removed += 1
                print(f"Removed old backup: {backup_file.name}")
        except Exception as e:
            print(f"Failed to remove {backup_file.name}: {e}")
    
    if removed:
        print(f"Cleaned up {removed} old backup(s)")


def main():
    """Run backup scheduler loop"""
    print("HesabPak Backup Scheduler v1.0.0 started")
    print(f"Backup directory: {BACKUP_DIR}")
    print(f"Retention: {RETENTION_DAYS} days")
    print(f"Encryption: {'enabled' if BACKUP_ENCRYPTION_KEY else 'disabled'}")
    
    while True:
        now = datetime.now()
        # Run at 2 AM daily
        next_run = now.replace(hour=2, minute=0, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
        
        sleep_seconds = (next_run - now).total_seconds()
        print(f"Next backup scheduled at: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Sleeping for {sleep_seconds / 3600:.1f} hours")
        
        time.sleep(sleep_seconds)
        
        # Run backup
        if run_backup():
            cleanup_old_backups()
        else:
            print("Backup failed, will retry tomorrow")


if __name__ == "__main__":
    main()
