from django.contrib import admin
from .models import SensorReading


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ("plot", "sensor_type", "value", "unit", "timestamp", "source")
    list_filter = ("sensor_type", "source", "plot")
    search_fields = ("plot__name",)
