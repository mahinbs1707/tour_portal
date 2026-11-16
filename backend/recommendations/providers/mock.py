"""Deterministic keyword/heuristic mock provider over published packages."""

from __future__ import annotations

import re
import sys
from typing import Sequence

from django.conf import settings

from packages.models import TourPackage
from recommendations.exceptions import ProviderBadResponse, ProviderUnavailable
from recommendations.providers.base import RecommendationMatch, RecommendationProvider

_TOKEN_RE = re.compile(r"[a-z0-9]+", re.IGNORECASE)


def _tokens(text: str) -> set[str]:
    return {t.lower() for t in _TOKEN_RE.findall(text or "") if len(t) >= 2}


def _running_tests() -> bool:
    """True under Django's test runner (Django 6+ no longer sets settings.TESTING)."""
    if getattr(settings, "TESTING", False):
        return True
    return any(arg == "test" for arg in sys.argv)


class MockRecommendationProvider(RecommendationProvider):
    """
    Score published packages by token overlap with title/destinations/descriptions.
    Force-fail hooks (tests only):
      AI_PROVIDER_FORCE_FAIL=bad_response → 502
      AI_PROVIDER_FORCE_FAIL=unavailable → 503
    """

    def recommend(
        self,
        prompt: str,
        packages: Sequence[TourPackage],
        *,
        limit: int = 5,
    ) -> list[RecommendationMatch]:
        # Test-only hook — ignore/clear outside the test runner.
        force = ""
        if _running_tests():
            force = (
                getattr(settings, "AI_PROVIDER_FORCE_FAIL", "") or ""
            ).strip().lower()
        if force in ("unavailable", "503", "down"):
            raise ProviderUnavailable()
        if force in ("bad_response", "502", "invalid"):
            raise ProviderBadResponse()

        prompt_tokens = _tokens(prompt)
        if not prompt_tokens:
            return []

        scored: list[RecommendationMatch] = []
        for package in packages:
            haystack = " ".join(
                [
                    package.title or "",
                    package.destinations or "",
                    package.short_description or "",
                    package.full_description or "",
                ]
            )
            package_tokens = _tokens(haystack)
            overlap = prompt_tokens & package_tokens
            if not overlap:
                continue
            # Prefer destination/title hits slightly for stable ranking.
            title_tokens = _tokens(package.title or "")
            dest_tokens = _tokens(package.destinations or "")
            score = (
                len(overlap) * 10
                + len(overlap & title_tokens) * 5
                + len(overlap & dest_tokens) * 3
            )
            why_bits = sorted(overlap)[:4]
            why = (
                "Matches your preferences for "
                + ", ".join(why_bits)
                + "."
            )
            scored.append(
                RecommendationMatch(
                    package_id=package.id,
                    why=why,
                    score=score,
                )
            )

        scored.sort(key=lambda m: (-m.score, str(m.package_id)))
        return scored[: max(0, limit)]
