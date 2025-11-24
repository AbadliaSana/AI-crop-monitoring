from rest_framework import serializers
from .models import AnomalyEvent
from sensors.serializers import SensorReadingSerializer
from farms.serializers import FieldPlotMiniSerializer


class AnomalyEventSerializer(serializers.ModelSerializer):
    plot_detail = FieldPlotMiniSerializer(source="plot", read_only=True)
    sensor_reading_detail = SensorReadingSerializer(source="sensor_reading", read_only=True)
    severity_label = serializers.CharField(source="get_severity_display", read_only=True)
    anomaly_type_label = serializers.CharField(source="get_anomaly_type_display", read_only=True)

    class Meta:
        model = AnomalyEvent
        fields = "__all__"
        read_only_fields = ["id", "timestamp"]

    def validate_model_confidence(self, value):
        if not (0.0 <= value <= 1.0):
            raise serializers.ValidationError("model_confidence doit être entre 0 et 1.")
        return value
