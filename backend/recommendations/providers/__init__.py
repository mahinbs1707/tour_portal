"""AI recommendation providers selected via settings.AI_PROVIDER."""

from __future__ import annotations

from django.conf import settings

from recommendations.exceptions import ProviderBadResponse
from recommendations.providers.base import RecommendationProvider
from recommendations.providers.mock import MockRecommendationProvider


def get_provider() -> RecommendationProvider:
    """Resolve the configured provider (default: mock)."""
    name = (getattr(settings, "AI_PROVIDER", "mock") or "mock").strip().lower()
    if name == "mock":
        return MockRecommendationProvider()
    raise ProviderBadResponse(
        "The recommendation provider configuration is invalid."
    )
