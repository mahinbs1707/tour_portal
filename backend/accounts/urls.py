"""Auth URL routes (Stories 1.4–1.5)."""

from django.urls import path

from accounts.views import CsrfView, LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("csrf/", CsrfView.as_view(), name="auth-csrf"),
]
