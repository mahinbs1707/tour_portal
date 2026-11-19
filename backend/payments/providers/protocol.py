"""PaymentProvider abstraction — mock-only in MVP (AD-6)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

MOCK_ATTEMPT_OUTCOMES = frozenset({"SUCCESS", "FAILED", "CANCELLED"})


@dataclass(frozen=True)
class MockAttemptResult:
    """Provider-agnostic mock attempt metadata returned before persisting."""

    attempt_reference: str


class PaymentProviderProtocol(Protocol):
    """Provider-agnostic surface for recording mock attempts."""

    def record_mock_attempt(self, *, outcome: str) -> MockAttemptResult:
        """Validate outcome and return attempt metadata (no DB writes)."""