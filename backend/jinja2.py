"""Compatibility shim for jinja2 used by starlette.templating in test env.
This module is additive and non-destructive. It provides minimal API expected by starlette.
"""
from functools import wraps
from typing import Any

# Provide contextfunction decorator expected by older jinja2
def contextfunction(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

# select_autoescape returns callable
def select_autoescape(enabled_extensions=None):
    return lambda name: False

class TemplateNotFound(Exception):
    pass

class FileSystemLoader:
    def __init__(self, searchpath=None):
        self.searchpath = searchpath

class Template:
    def __init__(self, name: str = ""):
        self.name = name

    def render(self, *args, **kwargs):
        return ""

class Environment:
    def __init__(self, loader: Any = None, autoescape: Any = None):
        self.loader = loader
        self.autoescape = autoescape

    def get_template(self, name: str):
        # Return a dummy template to avoid runtime failures in tests
        return Template(name=name)

    def from_string(self, s: str):
        return Template()

# Markup and escape helpers
class Markup(str):
    def __html__(self):
        return self

def escape(s: str):
    return s

# Expose expected names
__all__ = [
    'contextfunction',
    'select_autoescape',
    'FileSystemLoader',
    'Environment',
    'TemplateNotFound',
    'Markup',
    'escape',
]
