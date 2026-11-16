"""Provider interface for grounded published-package recommendations."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Sequence
from uuid import UUID

from packages.models import TourPackage


@dataclass(frozen=True)
class RecommendationMatch:
    """A scored match against a real published package id."""

    package_id: UUID
    why: str
    score: int = 0


class RecommendationProvider(ABC):
    """
    Match a free-text prompt against a published inventory snapshot.
    Implementations must never invent package ids outside the given pool.
    """

    @abstractmethod
    def recommend(
        self,
        prompt: str,
        packages: Sequence[TourPackage],
        *,
        limit: int = 5,
    ) -> list[RecommendationMatch]:
        """Return ≤ limit matches drawn only from `packages`."""
