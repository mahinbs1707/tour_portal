"""Request/response serializers for POST /api/recommendations/."""

from __future__ import annotations

from rest_framework import serializers

PROMPT_MAX_LEN = 2000


class RecommendationPromptSerializer(serializers.Serializer):
    """Validate free-text preference prompt (trim; reject blank/overlong)."""

    prompt = serializers.CharField(
        allow_blank=True,
        trim_whitespace=False,
        required=True,
        max_length=PROMPT_MAX_LEN,
    )

    def validate_prompt(self, value: str) -> str:
        if value is None:
            raise serializers.ValidationError("This field may not be blank.")
        text = str(value).strip()
        if not text:
            raise serializers.ValidationError("This field may not be blank.")
        if len(text) > PROMPT_MAX_LEN:
            raise serializers.ValidationError(
                f"Ensure this value has at most {PROMPT_MAX_LEN} characters."
            )
        return text
