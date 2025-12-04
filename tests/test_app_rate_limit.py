import pytest
from app.rate_limit import rate_limit, clear_windows

@pytest.mark.asyncio
async def test_rate_limit_exceeded():
    clear_windows()
    # Simulate 10 requests from the same IP
    for _ in range(10):
        response = await rate_limit("127.0.0.1")
        assert response is None
    # The 11th request should be rate-limited
    response = await rate_limit("127.0.0.1")
    assert response is not None
    assert response.status_code == 429, f"Expected 429 but got {response.status_code}"
