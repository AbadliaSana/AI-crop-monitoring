from rest_framework import serializers
from agent.models import AgentRecommendation
from anomalies.serializers import AnomalyEventSerializer


class AgentRecommendationSerializer(serializers.ModelSerializer):
    anomaly_event_detail = AnomalyEventSerializer(
        source="anomaly_event", read_only=True
    )
    status_label = serializers.CharField(
        source="get_status_display", read_only=True
    )
    confidence_level = serializers.CharField(read_only=True)

    class Meta:
        model = AgentRecommendation
        fields = [
            "id",
            "anomaly_event",
            "anomaly_event_detail",
            "timestamp",
            "action",
            "explanation",
            "confidence",
            "confidence_level",
            "status",
            "status_label",
        ]
        read_only_fields = ["id", "timestamp"]
