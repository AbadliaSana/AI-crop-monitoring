from rest_framework import serializers
from .models import AgentRecommendation
from anomalies.serializers import AnomalyEventSerializer


class AgentRecommendationSerializer(serializers.ModelSerializer):
    anomaly_event_detail = AnomalyEventSerializer(source="anomaly_event", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = AgentRecommendation
        fields = "__all__"
        read_only_fields = ["id", "timestamp"]
