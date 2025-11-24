from django.contrib import admin
from .models import FarmProfile, FieldPlot


@admin.register(FarmProfile)
class FarmProfileAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "location", "size_ha", "crop_type", "created_at")
    search_fields = ("name", "owner__username", "location", "crop_type")
    list_filter = ("crop_type",)


@admin.register(FieldPlot)
class FieldPlotAdmin(admin.ModelAdmin):
    list_display = ("name", "farm", "crop_variety", "area_m2", "status", "created_at")
    search_fields = ("name", "farm__name", "crop_variety")
    list_filter = ("status", "crop_variety")
