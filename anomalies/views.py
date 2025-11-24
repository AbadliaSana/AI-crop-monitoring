from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters import rest_framework as filters

from .models import AnomalyEvent
from .serializers import AnomalyEventSerializer


class AnomalyEventFilter(filters.FilterSet):
    date_from = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        model = AnomalyEvent
        fields = ["plot", "severity", "anomaly_type", "date_from", "date_to"]


class AnomalyEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    /api/anomalies/ [GET]
    /api/anomalies/{id}/ [GET]
    """
    queryset = AnomalyEvent.objects.all().order_by("-timestamp")
    serializer_class = AnomalyEventSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = AnomalyEventFilter
    search_fields = ["plot__name"]
    ordering_fields = ["timestamp", "severity", "model_confidence"]
