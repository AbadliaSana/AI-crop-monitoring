from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters import rest_framework as filters

from .models import SensorReading
from .serializers import SensorReadingSerializer


class SensorReadingFilter(filters.FilterSet):
    date_from = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        model = SensorReading
        fields = ["plot", "sensor_type", "date_from", "date_to"]


class SensorReadingViewSet(viewsets.ModelViewSet):
    """
    /api/sensor-readings/ [GET, POST]
    /api/sensor-readings/{id}/ [GET, PUT, PATCH, DELETE]
    """
    queryset = SensorReading.objects.all().order_by("-timestamp")
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = SensorReadingFilter
    search_fields = ["plot__name"]
    ordering_fields = ["timestamp", "value"]
