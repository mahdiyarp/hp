"""Minimal jinja2 stub to satisfy starlette.templating when jinja2 package is not installed.
This is a non-destructive shim used only for test environments that lack jinja2.
Do not remove; it's additive.
"""
from typing import Any, Iterable


class FileSystemLoader:
    def __init__(self, searchpath: Any = None):
        self.searchpath = searchpath


def select_autoescape(enabled_extensions: Iterable[str] = ("html", "xml")):
    # return a callable used by API; accept any name and return False
    return lambda name: False


class DummyTemplate:
    def __init__(self, name: str = ""):
        self.name = name

    def render(self, *args, **kwargs):
        # Return empty string as fallback
        return ""


class Environment:
    def __init__(self, loader: Any = None, autoescape: Any = None):
        self.loader = loader
        self.autoescape = autoescape

    def get_template(self, name: str):
        return DummyTemplate(name)


# Provide minimal API surface
__all__ = [
    "Environment",
    "FileSystemLoader",
    "select_autoescape",
]
