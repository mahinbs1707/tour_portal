"""Auth views: register/csrf (1.4) + login/logout/me (1.5)."""

from __future__ import annotations

from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from accounts.serializers import (
    LoginSerializer,
    MeSerializer,
    RegisterResponseSerializer,
    RegisterSerializer,
)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    """GET /api/auth/csrf/ — set readable csrftoken cookie for the SPA."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        get_token(request)
        return Response({"detail": "CSRF cookie set."})


class RegisterView(APIView):
    """POST /api/auth/register/ — create CUSTOMER and establish session."""

    permission_classes = [AllowAny]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        return Response(
            RegisterResponseSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """POST /api/auth/login/ — shared Customer + Admin Sign in."""

    permission_classes = [AllowAny]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        return Response(MeSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """POST /api/auth/logout/ — invalidate session."""

    permission_classes = [AllowAny]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """GET /api/auth/me/ — current session identity (role/staff/superuser)."""

    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfSessionAuthentication]

    def get(self, request):
        return Response(MeSerializer(request.user).data)
