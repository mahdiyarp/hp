#!/usr/bin/env python3
"""Reset developer user's password in DB (dev only).
Usage:
  python reset_password.py [new_password]
If no password provided, defaults to '09123506545'.
"""
import os
import sys
ROOT = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, ROOT)
from app import db, crud, security
from sqlalchemy.orm import Session

new_pw = sys.argv[1] if len(sys.argv) > 1 else '09123506545'

session = db.SessionLocal()
try:
    user = session.query(db.Base.classes.users).filter_by(username='developer').first() if hasattr(db.Base, 'classes') else None
    # fallback queries
    if not user:
        from app import models
        user = session.query(models.User).filter(models.User.username == 'developer').first()
        if not user:
            user = session.query(models.User).filter(models.User.mobile == '09123506545').first()
    if not user:
        print('Developer user not found')
        sys.exit(1)
    hashed = security.get_password_hash(new_pw)
    # Try both field names for hashed password
    if hasattr(user, 'hashed_password'):
        user.hashed_password = hashed
    elif hasattr(user, 'password_hash'):
        user.password_hash = hashed
    else:
        print('No known password field on user model')
        sys.exit(1)
    session.add(user)
    session.commit()
    print(f"Password for user {user.username} reset to '{new_pw}' (hashed stored)")
finally:
    session.close()
