"""Provider failure exceptions mapped to controlled HTTP 502/503 responses."""

from __future__ import annotations


class ProviderError(Exception):
    """Base class for AI provider failures (never leak upstream details)."""

    code: str = "provider_error"
    message: str = "The recommendation provider failed."
    http_status: int = 502

    def __init__(self, message: str | None = None):
        self.message = message or self.__class__.message
        super().__init__(self.message)

    def as_error_body(self) -> dict:
        return {"error": {"code": self.code, "message": self.message}}


class ProviderBadResponse(ProviderError):
    """Invalid or unusable upstream response → HTTP 502."""

    code = "provider_bad_response"
    message = "The recommendation provider returned an invalid response."
    http_status = 502


class ProviderUnavailable(ProviderError):
    """Temporarily unavailable upstream → HTTP 503."""

    code = "provider_unavailable"
    message = "The recommendation provider is temporarily unavailable."
    http_status = 503
