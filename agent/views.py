from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django_filters import rest_framework as filters

from .models import AgentRecommendation
from .serializers import AgentRecommendationSerializer


class AgentRecommendationFilter(filters.FilterSet):
    date_from = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="lte")

    class Meta:
        model = AgentRecommendation
        fields = ["status", "date_from", "date_to", "anomaly_event__plot"]


class AgentRecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    /api/recommendations/ [GET]
    /api/recommendations/{id}/ [GET]
    """
    queryset = AgentRecommendation.objects.all().order_by("-timestamp")
    serializer_class = AgentRecommendationSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = AgentRecommendationFilter
    search_fields = ["anomaly_event__plot__name"]
    ordering_fields = ["timestamp", "confidence"]
