import pytest
from app.rate_limit import SimpleRateLimiter


def test_rate_limiter_allows_and_blocks():
    rl = SimpleRateLimiter()
    key = 'testkey'
    # allow first token when rate 1 per minute but burst 2
    assert rl.allow(key, rate_per_min=1, burst=2) is True
    # immediate second should be allowed because of burst
    assert rl.allow(key, rate_per_min=1, burst=2) is True
    # third immediate should be blocked
    assert rl.allow(key, rate_per_min=1, burst=2) is False


def test_rate_limiter_refill():
    rl = SimpleRateLimiter()
    key = 'refillkey'
    assert rl.allow(key, rate_per_min=60, burst=5) is True
    # consume remaining burst
    for _ in range(4):
        assert rl.allow(key, rate_per_min=60, burst=5) is True
    # now blocked
    assert rl.allow(key, rate_per_min=60, burst=5) is False
    # simulate wait by directly manipulating internal store (not ideal but ok for unit test)
    tokens, last_ts, cfg = rl._store.get(key)
    rl._store[key] = (tokens + 60.0, last_ts, cfg)
    # now allowing again
    assert rl.allow(key, rate_per_min=60, burst=5) is True
