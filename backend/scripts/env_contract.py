"""In-container Django env contract checks for Story 1.1.

Run from the backend image working directory (/app):
  python scripts/env_contract.py
"""

from __future__ import annotations

import importlib
import os
import sys
from collections.abc import Callable
from pathlib import Path

# `python scripts/env_contract.py` puts /app/scripts on sys.path[0]; ensure /app is importable.
_APP_ROOT = Path(__file__).resolve().parents[1]
if str(_APP_ROOT) not in sys.path:
    sys.path.insert(0, str(_APP_ROOT))


def _reload_settings() -> None:
    for name in list(sys.modules):
        if name == "config.settings" or name.startswith("config.settings."):
            del sys.modules[name]
    importlib.import_module("config.settings")


def _expect_runtime_error(label: str, mutate: Callable[[], None], needle: str) -> None:
    snapshot = dict(os.environ)
    try:
        mutate()
        try:
            _reload_settings()
        except RuntimeError as exc:
            text = str(exc)
            if needle not in text:
                raise AssertionError(
                    f"{label}: expected RuntimeError containing {needle!r}, got {text!r}"
                ) from exc
            print(f"OK: {label}")
            return
        raise AssertionError(f"{label}: settings imported but should have failed")
    finally:
        os.environ.clear()
        os.environ.update(snapshot)


def _expect_ok(label: str, mutate: Callable[[], None]) -> None:
    snapshot = dict(os.environ)
    try:
        mutate()
        _reload_settings()
        print(f"OK: {label}")
    finally:
        os.environ.clear()
        os.environ.update(snapshot)


def main() -> int:
    # Baseline secret required for positive cases.
    if not (os.environ.get("DJANGO_SECRET_KEY") or "").strip():
        os.environ["DJANGO_SECRET_KEY"] = "config-validate-temp-secret"

    _expect_runtime_error(
        "empty DJANGO_SECRET_KEY",
        lambda: os.environ.__setitem__("DJANGO_SECRET_KEY", ""),
        "DJANGO_SECRET_KEY must be set",
    )
    _expect_runtime_error(
        "whitespace DJANGO_SECRET_KEY",
        lambda: os.environ.__setitem__("DJANGO_SECRET_KEY", "   "),
        "DJANGO_SECRET_KEY must be set",
    )
    _expect_runtime_error(
        "blank DJANGO_ALLOWED_HOSTS",
        lambda: (
            os.environ.__setitem__(
                "DJANGO_SECRET_KEY", "config-validate-temp-secret"
            ),
            os.environ.__setitem__("DJANGO_ALLOWED_HOSTS", " , , "),
        ),
        "DJANGO_ALLOWED_HOSTS is set but contains no valid hosts",
    )
    _expect_runtime_error(
        "invalid CSRF origin scheme",
        lambda: (
            os.environ.__setitem__(
                "DJANGO_SECRET_KEY", "config-validate-temp-secret"
            ),
            os.environ.__setitem__("CSRF_TRUSTED_ORIGINS", "localhost:8080"),
        ),
        "must start with http:// or https://",
    )

    _expect_ok(
        "empty CSRF_TRUSTED_ORIGINS allowed",
        lambda: (
            os.environ.__setitem__(
                "DJANGO_SECRET_KEY", "config-validate-temp-secret"
            ),
            os.environ.__setitem__("CSRF_TRUSTED_ORIGINS", ""),
        ),
    )
    _expect_ok(
        "valid hosts and csrf",
        lambda: (
            os.environ.__setitem__(
                "DJANGO_SECRET_KEY", "config-validate-temp-secret"
            ),
            os.environ.__setitem__("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1"),
            os.environ.__setitem__(
                "CSRF_TRUSTED_ORIGINS", "http://localhost:8080"
            ),
        ),
    )

    print("PASS: Story 1.1 configuration validation")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc
