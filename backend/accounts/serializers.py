"""Auth serializers for registration, login, and session (Stories 1.4–1.5)."""

from __future__ import annotations

import re

from django.contrib.auth import authenticate, get_user_model
from django.db import IntegrityError
from rest_framework import serializers

from accounts.models import Role

User = get_user_model()

PASSWORD_POLICY_MESSAGE = (
    "Password must be at least 8 characters and include at least one letter "
    "and one number."
)

INVALID_CREDENTIALS_MESSAGE = "Invalid email or password."


def validate_password_policy(password: str) -> str:
    """FR-AUTH-15: ≥8 chars, ≥1 letter, ≥1 number."""
    if (
        len(password) < 8
        or not re.search(r"[A-Za-z]", password)
        or not re.search(r"\d", password)
    ):
        raise serializers.ValidationError(PASSWORD_POLICY_MESSAGE)
    return password


class RegisterSerializer(serializers.Serializer):
    """Customer-only registration. Client-supplied role is ignored."""

    full_name = serializers.CharField(max_length=255, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    confirm_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate_full_name(self, value: str) -> str:
        name = (value or "").strip()
        if not name:
            raise serializers.ValidationError("Full name is required.")
        return name

    def validate_email(self, value: str) -> str:
        email = User.objects.normalize_email(value)
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return email

    def validate_password(self, value: str) -> str:
        return validate_password_policy(value)

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Password and confirm password must match."}
            )
        return attrs

    def create(self, validated_data):
        # Always CUSTOMER; never trust a client role / staff elevation.
        validated_data.pop("confirm_password", None)
        try:
            return User.objects.create_user(
                email=validated_data["email"],
                password=validated_data["password"],
                full_name=validated_data["full_name"],
                role=Role.CUSTOMER,
                is_staff=False,
                is_superuser=False,
            )
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"email": "An account with this email already exists."}
            ) from exc



class RegisterResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "role")
        read_only_fields = fields


class LoginSerializer(serializers.Serializer):
    """Shared Customer + Admin Sign in (email + password)."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        email = User.objects.normalize_email(attrs.get("email", ""))
        password = attrs.get("password") or ""
        # Never log plaintext passwords. Generic failure for unknown email / bad password.
        user = authenticate(
            request=self.context.get("request"),
            email=email,
            password=password,
        )
        if user is None or not user.is_active:
            raise serializers.ValidationError(INVALID_CREDENTIALS_MESSAGE)
        attrs["user"] = user
        attrs["email"] = email
        return attrs


class MeSerializer(serializers.ModelSerializer):
    """Session identity for bootstrap and FE auth UX (role is the FE key)."""

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "role",
            "is_staff",
            "is_superuser",
        )
        read_only_fields = fields


class PasswordResetRequestSerializer(serializers.Serializer):
    """Request a password-reset token (anti-enumeration: always succeeds)."""

    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        return User.objects.normalize_email(value)


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Confirm reset with uid + token + new password."""

    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    confirm_password = serializers.CharField(
        write_only=True, style={"input_type": "password"}
    )

    def validate_password(self, value: str) -> str:
        return validate_password_policy(value)

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": "Password and confirm password must match."}
            )
        return attrs
