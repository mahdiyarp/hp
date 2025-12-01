from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from . import crud, db
from typing import Optional


def get_api_key(x_api_key: Optional[str] = Header(None)):
    """Dependency to validate x-api-key header and return associated DeveloperApiKey model or None."""
    if not x_api_key:
        return None
    # incoming header contains plain key; hash and lookup
    key_hash = crud.hash_api_key(x_api_key)
    session: Session = db.SessionLocal()
    try:
        key = crud.get_api_key_by_hash(session, key_hash)
        if not key:
            raise HTTPException(status_code=401, detail='Invalid API key')
        return key
    finally:
        session.close()
