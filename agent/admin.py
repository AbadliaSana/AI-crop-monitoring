from django.contrib import admin
from .models import AgentRecommendation


@admin.register(AgentRecommendation)
class AgentRecommendationAdmin(admin.ModelAdmin):
    list_display = ("anomaly_event", "timestamp", "confidence", "status")
    list_filter = ("status",)
    search_fields = ("anomaly_event__plot__name",)
