import time
from typing import Any, Optional

# Extremely small in-memory TTL cache suitable for single-process dev runs.
# For production use, replace with Redis or memcached.

_STORE: dict = {}


def set_cache(key: str, value: Any, ttl_seconds: int = 60):
    expire = time.time() + int(ttl_seconds)
    _STORE[key] = (value, expire)


def get_cache(key: str) -> Optional[Any]:
    v = _STORE.get(key)
    if not v:
        return None
    val, expire = v
    if time.time() > expire:
        try:
            del _STORE[key]
        except KeyError:
            pass
        return None
    return val


def invalidate(key: str):
    try:
        del _STORE[key]
    except KeyError:
        pass
