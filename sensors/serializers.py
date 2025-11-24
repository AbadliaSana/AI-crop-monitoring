from rest_framework import serializers
from .models import SensorReading
from farms.serializers import FieldPlotMiniSerializer


class SensorReadingSerializer(serializers.ModelSerializer):
    plot_detail = FieldPlotMiniSerializer(source="plot", read_only=True)

    class Meta:
        model = SensorReading
        fields = "__all__"
        read_only_fields = ["id", "timestamp"]

    def validate(self, attrs):
        """
        Exemple de validation avancée : plages de valeurs selon le type de capteur.
        """
        sensor_type = attrs.get("sensor_type") or getattr(self.instance, "sensor_type", None)
        value = attrs.get("value") or getattr(self.instance, "value", None)

        if sensor_type == "moisture" and not (0 <= value <= 100):
            raise serializers.ValidationError("La valeur d'humidité du sol doit être entre 0 et 100%.")
        if sensor_type == "temperature" and not (-20 <= value <= 60):
            raise serializers.ValidationError("La température doit être entre -20°C et 60°C.")
        if sensor_type == "humidity" and not (0 <= value <= 100):
            raise serializers.ValidationError("L'humidité doit être entre 0 et 100%.")
        return attrs
