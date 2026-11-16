from django.contrib import admin

from packages.models import TourPackage


@admin.register(TourPackage)
class TourPackageAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "base_price", "currency", "updated_at")
    list_filter = ("status",)
    search_fields = ("title", "destinations")
