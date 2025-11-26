from rest_framework.routers import DefaultRouter
from agent.views import AgentRecommendationViewSet

router = DefaultRouter()
router.register("recommendations", AgentRecommendationViewSet)

urlpatterns = router.urls
