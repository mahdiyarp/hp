import pytest

try:
    from app.main import app
except Exception:
    app = None


@pytest.fixture(autouse=True)
def _manage_fastapi_dependency_overrides():
    """Prevent cross-test leakage, especially auth overrides.
    At test start, drop any overrides for callables named 'get_current_user'.
    Preserve other overrides (like db.get_db) set by the test module.
    """
    if app is None:
        yield
        return
    # Remove auth overrides that may leak from other tests/modules
    try:
        to_delete = [k for k in app.dependency_overrides.keys() if getattr(k, "__name__", "") == "get_current_user"]
        for k in to_delete:
            try:
                del app.dependency_overrides[k]
            except Exception:
                pass
    except Exception:
        pass
    yield
