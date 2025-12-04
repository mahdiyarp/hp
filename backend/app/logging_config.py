import logging
import os


def configure_logging() -> None:
    """Configure application logging using LOG_LEVEL env var.

    Defaults to INFO; supports DEBUG, INFO, WARNING, ERROR, CRITICAL.
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
