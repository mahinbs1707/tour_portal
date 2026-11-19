from django.contrib import admin

from custom_tours.models import CustomTour, CustomTourSubmitIdempotency


@admin.register(CustomTour)
class CustomTourAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "customer", "status", "start_date", "created_at")
    list_filter = ("status",)
    search_fields = ("title", "destination", "id")


@admin.register(CustomTourSubmitIdempotency)
class CustomTourSubmitIdempotencyAdmin(admin.ModelAdmin):
    list_display = ("idempotency_key", "customer", "custom_tour", "created_at")