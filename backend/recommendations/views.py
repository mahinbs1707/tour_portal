"""Recommendations API — POST /api/recommendations/ (AllowAny)."""

from __future__ import annotations

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from recommendations.exceptions import ProviderError
from recommendations.serializers import RecommendationPromptSerializer
from recommendations.services import RecommendationService


class RecommendationCreateView(APIView):
    """
    POST { "prompt": "..." } → 200 { "results": [...] }
    Invalid prompt → 400 field errors on prompt (no provider call).
    Provider failure → 502/503 { "error": { "code", "message" } } (no package list).
    """

    permission_classes = [AllowAny]
    http_method_names = ["post", "head", "options"]

    def post(self, request):
        serializer = RecommendationPromptSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        prompt = serializer.validated_data["prompt"]
        try:
            results = RecommendationService().recommend(prompt)
        except ProviderError as exc:
            return Response(exc.as_error_body(), status=exc.http_status)

        return Response({"results": results}, status=status.HTTP_200_OK)
