"""
config.py — Backwards-compatibility shim.
All settings now live in core/config.py.
"""
from core.config import settings  # noqa: F401 — re-export for any old imports
