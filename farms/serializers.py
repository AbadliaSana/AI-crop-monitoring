from rest_framework import serializers
from .models import FarmProfile, FieldPlot


class FieldPlotMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldPlot
        fields = ("id", "name", "crop_variety", "status")


class FarmProfileMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmProfile
        fields = ("id", "name", "location", "crop_type")
