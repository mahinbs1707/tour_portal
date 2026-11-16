"""Recommendation API URL routes."""

from django.urls import path

from recommendations.views import RecommendationCreateView

urlpatterns = [
    path(
        "",
        RecommendationCreateView.as_view(),
        name="recommendation-create",
    ),
]
