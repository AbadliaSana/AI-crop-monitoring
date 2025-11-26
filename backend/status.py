import logging
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from kombu import Connection

from backend.celery import app
from anomalies.models import AnomalyEvent
from ml_module.anomaly_models import ISO_MODEL_PATH

logger = logging.getLogger(__name__)


class StatusView(APIView):
    """Simple health endpoint for Redis/Celery + anomaly recap."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Redis/Broker check via kombu (no extra dependency).
        redis_ok, redis_error = False, None
        try:
            with Connection(settings.CELERY_BROKER_URL) as conn:
                conn.ensure_connection(max_retries=1)
                redis_ok = True
        except Exception as exc:
            redis_error = str(exc)
            logger.warning("Redis check failed: %s", exc)

        # Celery worker ping
        celery_ok, celery_error = False, None
        try:
            celery_ok = bool(app.control.ping(timeout=2))
        except Exception as exc:
            celery_error = str(exc)
            logger.warning("Celery ping failed: %s", exc)

        recent = list(
            AnomalyEvent.objects.order_by("-timestamp")[:5].values(
                "id", "anomaly_type", "severity", "model_confidence", "timestamp"
            )
        )

        data = {
            "redis_ok": redis_ok,
            "redis_error": redis_error,
            "celery_ok": celery_ok,
            "celery_error": celery_error,
            "iso_model_present": ISO_MODEL_PATH.exists(),
            "anomalies_count": AnomalyEvent.objects.count(),
            "anomalies_recent": recent,
        }
        return Response(data)
