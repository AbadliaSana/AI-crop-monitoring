from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from sensors.views import SensorReadingViewSet
from anomalies.views import AnomalyEventViewSet
from agent.views import AgentRecommendationViewSet
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from backend.status import StatusView
from ml_module.views import MetricsView
from accounts.views import RegisterView

router = DefaultRouter()
router.register("sensor-readings", SensorReadingViewSet, basename="sensor-reading")
router.register("anomalies", AnomalyEventViewSet, basename="anomaly")
router.register("recommendations", AgentRecommendationViewSet, basename="recommendation")

urlpatterns = [
    path("admin/", admin.site.urls),

    # Auth JWT
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/register/", RegisterView.as_view(), name="register"),

    # API
    path("api/", include(router.urls)),
    path("api/status/", StatusView.as_view(), name="status"),
    path("api/metrics/", MetricsView.as_view(), name="metrics"),
]
