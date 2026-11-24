"""Auth views: register/csrf (1.4) + login/logout/me (1.5) + password reset."""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth import get_user_model, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfSessionAuthentication
from accounts.serializers import (
    LoginSerializer,
    MeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterResponseSerializer,
    RegisterSerializer,
)

User = get_user_model()

PASSWORD_RESET_GENERIC = (
    "If an account exists for that email, password reset instructions are ready."
)
PASSWORD_RESET_INVALID = "This password reset link is invalid or has expired."


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


class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/ — start reset (mock delivery when DEBUG)."""

    permission_classes = [AllowAny]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        payload = {"detail": PASSWORD_RESET_GENERIC}

        user = User.objects.filter(email=email, is_active=True).first()
        if user is not None and settings.DEBUG:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            payload["mock_reset_path"] = (
                f"/reset-password?uid={uid}&token={token}"
            )
            payload["mock_delivery_note"] = (
                "MVP has no email/SMS. Use this mock reset link locally."
            )
        return Response(payload, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset/confirm/ — set a new password from token."""

    permission_classes = [AllowAny]
    authentication_classes = [CsrfSessionAuthentication]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response(
                {"detail": PASSWORD_RESET_INVALID},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": PASSWORD_RESET_INVALID},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save(update_fields=["password"])
        return Response(
            {"detail": "Password updated. You can sign in with your new password."},
            status=status.HTTP_200_OK,
        )
