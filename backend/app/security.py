import os
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext

from dotenv import load_dotenv

load_dotenv(dotenv_path='.env')

SECRET_KEY = os.getenv('SECRET_KEY', 'changeme-secret')
ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', '15'))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', '30'))

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": subject, "exp": int(expire.timestamp())}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"sub": subject, "exp": int(expire.timestamp())}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise


# Optional field-level encryption using Fernet. Provide env var DATABASE_ENCRYPTION_KEY (base64 urlsafe key)
try:
    from cryptography.fernet import Fernet, InvalidToken
    _FERNET_KEY = os.getenv('DATABASE_ENCRYPTION_KEY')
    _FERNET = Fernet(_FERNET_KEY) if _FERNET_KEY else None
except Exception:
    _FERNET = None


def encrypt_value(plaintext: str) -> str:
    if not plaintext:
        return plaintext
    if not _FERNET:
        return plaintext
    try:
        return _FERNET.encrypt(plaintext.encode('utf-8')).decode('utf-8')
    except Exception:
        return plaintext


def decrypt_value(ciphertext: str) -> str:
    if not ciphertext:
        return ciphertext
    if not _FERNET:
        return ciphertext
    try:
        return _FERNET.decrypt(ciphertext.encode('utf-8')).decode('utf-8')
    except Exception:
        return ciphertext
