from functools import lru_cache

from .config import Settings


@lru_cache(maxsize=1)
def get_settings() -> Settings:
  """
  Cached access to application settings so expensive env parsing
  only happens once per process.
  """
  return Settings()

