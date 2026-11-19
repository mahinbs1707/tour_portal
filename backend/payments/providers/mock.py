"""Mock payment provider — no real instruments (FR-PAY-04)."""

from __future__ import annotations

import uuid

from payments.providers.protocol import MOCK_ATTEMPT_OUTCOMES, MockAttemptResult


class MockPaymentProvider:
    """Simulates provider references for SUCCESS / FAILED / CANCELLED outcomes."""

    def record_mock_attempt(self, *, outcome: str) -> MockAttemptResult:
        if outcome not in MOCK_ATTEMPT_OUTCOMES:
            raise ValueError(f"Unsupported mock outcome: {outcome!r}")
        ref = f"MOCK-{uuid.uuid4().hex[:12].upper()}"
        return MockAttemptResult(attempt_reference=ref)