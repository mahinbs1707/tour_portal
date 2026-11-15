"""Custom User with CUSTOMER|ADMIN roles (AD-3 / AD-9 / AD-19)."""

from __future__ import annotations

import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Role(models.TextChoices):
    CUSTOMER = "CUSTOMER", "Customer"
    ADMIN = "ADMIN", "Admin"


def validate_role_staff_matrix(*, role: str, is_staff: bool) -> None:
    """Reject illegal role/staff combinations (AD-3 seed invariant)."""
    if role == Role.ADMIN and not is_staff:
        raise ValidationError(
            {
                "is_staff": (
                    "Admin users must have is_staff=True "
                    "(illegal matrix: role=ADMIN, is_staff=False)."
                )
            }
        )
    if role == Role.CUSTOMER and is_staff:
        raise ValidationError(
            {
                "is_staff": (
                    "Customer users must have is_staff=False "
                    "(illegal matrix: role=CUSTOMER, is_staff=True)."
                )
            }
        )


class UserManager(BaseUserManager):
    use_in_migrations = True

    def normalize_email(self, email: str) -> str:
        return super().normalize_email((email or "").strip()).lower()

    def _create_user(
        self,
        email: str,
        password: str | None,
        **extra_fields,
    ):
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.full_clean()
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields):
        extra_fields.setdefault("role", Role.CUSTOMER)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields):
        # Django Admin break-glass helper; application Admin seed uses is_superuser=False.
        extra_fields.setdefault("role", Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255, blank=True, default="")
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER,
        db_index=True,
    )
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = ["full_name"]

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(role=Role.ADMIN, is_staff=True)
                    | models.Q(role=Role.CUSTOMER, is_staff=False)
                ),
                name="accounts_user_role_staff_matrix",
            ),
        ]

    def __str__(self) -> str:
        return self.email

    def clean(self) -> None:
        super().clean()
        if self.email:
            self.email = type(self).objects.normalize_email(self.email)
        validate_role_staff_matrix(role=self.role, is_staff=self.is_staff)

    def save(self, *args, **kwargs):
        # Enforce role/staff invariant on every write (model + seed path).
        self.full_clean()
        return super().save(*args, **kwargs)
