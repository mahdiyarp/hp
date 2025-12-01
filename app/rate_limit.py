# Compatibility shim for rate_limit
from importlib import import_module
_backend_rl = import_module('backend.app.rate_limit')
SimpleRateLimiter = getattr(_backend_rl, 'SimpleRateLimiter')
RedisRateLimiter = getattr(_backend_rl, 'RedisRateLimiter')
get_limiter = getattr(_backend_rl, 'get_limiter')
limiter = getattr(_backend_rl, 'limiter')
__all__ = ['SimpleRateLimiter','RedisRateLimiter','get_limiter','limiter']
