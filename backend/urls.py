from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from sensors.views import SensorReadingViewSet
from anomalies.views import AnomalyEventViewSet
from agent.views import AgentRecommendationViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register("sensor-readings", SensorReadingViewSet, basename="sensor-reading")
router.register("anomalies", AnomalyEventViewSet, basename="anomaly")
router.register("recommendations", AgentRecommendationViewSet, basename="recommendation")

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth JWT
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # API
    path("api/", include(router.urls)),
]
