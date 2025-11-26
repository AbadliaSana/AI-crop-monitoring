from rest_framework import viewsets
from agent.models import AgentRecommendation
from agent.serializers import AgentRecommendationSerializer


class AgentRecommendationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AgentRecommendation.objects.all()
    serializer_class = AgentRecommendationSerializer
