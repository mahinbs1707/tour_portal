"""RecommendationService — coordinates provider + published-only grounding."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404

from packages.models import TourPackage
from packages.services import get_published, published
from recommendations.exceptions import ProviderBadResponse, ProviderError
from recommendations.providers import get_provider
from recommendations.providers.base import RecommendationMatch, RecommendationProvider

MAX_RESULTS = 5


class RecommendationService:
    """
    Return ≤5 recommendations grounded only on published TourPackage rows.
    Provider failures raise ProviderError subclasses (mapped to 502/503 by the view).
    """

    def __init__(self, provider: RecommendationProvider | None = None):
        self.provider = provider or get_provider()

    def recommend(self, prompt: str) -> list[dict[str, Any]]:
        """
        Run the provider against the published inventory and hydrate card payloads.
        Never invent packages; drop any id that is not currently published.
        """
        inventory = list(published())
        try:
            matches = self.provider.recommend(
                prompt,
                inventory,
                limit=MAX_RESULTS,
            )
        except ProviderError:
            raise
        except Exception as exc:
            # Controlled failure — never leak raw upstream/exception text.
            raise ProviderBadResponse() from exc

        try:
            if (
                matches is None
                or isinstance(matches, (str, bytes))
                or not isinstance(matches, Sequence)
            ):
                raise ProviderBadResponse()
            return self._hydrate(matches[:MAX_RESULTS])
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderBadResponse() from exc

    def _hydrate(self, matches: Sequence[RecommendationMatch]) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        seen: set[str] = set()
        for match in matches:
            try:
                package = get_published(match.package_id)
            except (Http404, ValueError, DjangoValidationError):
                # Draft/missing/invalid ids must never appear in the public list.
                continue
            key = str(package.id)
            if key in seen:
                continue
            seen.add(key)
            results.append(self._card(package, why=match.why))
            if len(results) >= MAX_RESULTS:
                break
        return results

    @staticmethod
    def _card(package: TourPackage, *, why: str) -> dict[str, Any]:
        return {
            "id": str(package.id),
            "title": package.title,
            "cover_image": package.cover_image,
            "short_description": package.short_description,
            "destinations": package.destinations,
            "duration_days": package.duration_days,
            "duration_nights": package.duration_nights,
            "base_price": str(package.base_price),
            "currency": package.currency,
            "why": why,
        }
