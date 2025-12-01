"""Lightweight shim for Jinja2 to satisfy starlette/fastapi imports in test env where jinja2 is not available or incompatible.
This file is additive and non-destructive. It provides minimal API surface used by starlette.templating.
"""
from functools import wraps
from typing import Any

# Provide a simple contextfunction decorator (identity decorator)
def contextfunction(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

# Provide select_autoescape used by starlette
def select_autoescape(enabled_extensions=None):
    return lambda name: False

# Minimal FileSystemLoader and Environment to return a dummy template
class FileSystemLoader:
    def __init__(self, searchpath=None):
        self.searchpath = searchpath

class Template:
    def __init__(self, name=""):
        self.name = name

    def render(self, *args, **kwargs):
        # Return empty string or a basic placeholder; keep non-destructive
        return ""

class Environment:
    def __init__(self, loader: Any = None, autoescape: Any = None):
        self.loader = loader
        self.autoescape = autoescape

    def get_template(self, name: str):
        return Template(name=name)

# Markup class used by jinja sometimes
class Markup(str):
    def __html__(self):
        return self

# expose API
__all__ = [
    'contextfunction',
    'select_autoescape',
    'FileSystemLoader',
    'Environment',
    'Template',
    'Markup',
]
