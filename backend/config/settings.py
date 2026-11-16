"""Django settings for Tour Portal (Compose baseline skeleton)."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = (os.environ.get("DJANGO_SECRET_KEY") or "").strip()
if not SECRET_KEY:
    raise RuntimeError(
        "DJANGO_SECRET_KEY must be set via the environment "
        "(non-empty, not whitespace-only)"
    )

DEBUG = os.environ.get("DJANGO_DEBUG", "0") == "1"


def _parse_csv_env(name: str) -> list[str] | None:
    """Return parsed non-empty tokens, or None when the variable is unset."""
    if name not in os.environ:
        return None
    return [part.strip() for part in os.environ[name].split(",") if part.strip()]


_raw_allowed_hosts = _parse_csv_env("DJANGO_ALLOWED_HOSTS")
if _raw_allowed_hosts is None:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
elif not _raw_allowed_hosts:
    raise RuntimeError(
        "DJANGO_ALLOWED_HOSTS is set but contains no valid hosts after parsing. "
        "Provide a comma-separated list (e.g. localhost,127.0.0.1)."
    )
else:
    ALLOWED_HOSTS = _raw_allowed_hosts

_raw_csrf_origins = _parse_csv_env("CSRF_TRUSTED_ORIGINS")
if _raw_csrf_origins is None:
    # Local Compose default only when unset; empty list is valid for same-origin.
    CSRF_TRUSTED_ORIGINS = ["http://localhost:8080"]
else:
    CSRF_TRUSTED_ORIGINS = _raw_csrf_origins
    for origin in CSRF_TRUSTED_ORIGINS:
        if not (
            origin.startswith("http://") or origin.startswith("https://")
        ):
            raise RuntimeError(
                f"CSRF_TRUSTED_ORIGINS entry {origin!r} must start with "
                "http:// or https://"
            )


BUSINESS_TIMEZONE = os.environ.get("BUSINESS_TIMEZONE", "Asia/Dhaka")
TIME_ZONE = BUSINESS_TIMEZONE

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "accounts",
    "common",
    "notifications",
    "audit",
    "packages",
]

AUTH_USER_MODEL = "accounts.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

if os.environ.get("DJANGO_USE_SQLITE") == "1":
    # Local/unit-test convenience (Compose runtime still uses Postgres).
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.environ.get("DJANGO_SQLITE_NAME", str(BASE_DIR / "db.sqlite3")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DB", "tourportal"),
            "USER": os.environ.get("POSTGRES_USER", "tourportal"),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", ""),
            "HOST": os.environ.get("POSTGRES_HOST", "postgres"),
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.environ.get("MEDIA_ROOT", str(BASE_DIR / "media")))
# Illustrative default until product finalizes upload size policy (AD-24 / Story 2.3).
_DEFAULT_MEDIA_UPLOAD_MAX_BYTES = 5242880
try:
    MEDIA_UPLOAD_MAX_BYTES = int(
        os.environ.get("MEDIA_UPLOAD_MAX_BYTES", str(_DEFAULT_MEDIA_UPLOAD_MAX_BYTES))
    )
except (TypeError, ValueError):
    MEDIA_UPLOAD_MAX_BYTES = _DEFAULT_MEDIA_UPLOAD_MAX_BYTES


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Session + CSRF for same-origin SPA (AD-2 / Story 1.4)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False  # readable by JS for X-CSRFToken
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not DEBUG
CSRF_HEADER_NAME = "HTTP_X_CSRFTOKEN"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "accounts.authentication.CsrfSessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",
    ],
    # Pagination is opt-in per view (packages Admin list); do not change auth/other arrays.
}

# Optional local stub flag (no provider integration in Story 1.1)
AI_PROVIDER = os.environ.get("AI_PROVIDER", "mock")
