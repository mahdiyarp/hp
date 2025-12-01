from pathlib import Path

from pydantic import BaseSettings, Field, validator


class Settings(BaseSettings):
  """
  Centralised application configuration loaded from environment or .env file.
  """

  app_name: str = Field(default="HesabPak Backend", env="APP_NAME")
  environment: str = Field(default="development", env="ENVIRONMENT")
  database_url: str = Field(default="sqlite:///./hesabpak.db", env="DATABASE_URL")

  # JWT / auth
  secret_key: str = Field(default="change-me", env="SECRET_KEY")
  jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
  access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
  refresh_token_expire_days: int = Field(default=30, env="REFRESH_TOKEN_EXPIRE_DAYS")

  # Feature toggles
  demo_mode: bool = Field(default=False, env="DEMO_MODE")

  class Config:
    env_file_encoding = "utf-8"
    env_file = str(Path(__file__).resolve().parents[2] / ".env")

  @validator("database_url")
  def validate_db_url(cls, value: str) -> str:
    if not value:
      raise ValueError("DATABASE_URL must be provided")
    return value
