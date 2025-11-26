from django.db import models
from anomalies.models import AnomalyEvent


class AgentRecommendation(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("acknowledged", "Acknowledged"),
        ("resolved", "Resolved"),
    ]

    anomaly_event = models.OneToOneField(
        AnomalyEvent,
        on_delete=models.CASCADE,
        related_name="recommendation",
        help_text="Associated anomaly event that triggered this recommendation.",
    )

    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="Recommendation creation timestamp.",
    )

    action = models.TextField(
        help_text="Action recommended by the agent."
    )

    explanation = models.TextField(
        help_text="Human-readable explanation of the recommendation."
    )

    confidence = models.FloatField(
        help_text="Confidence score (0-1)."
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Current status of the recommendation.",
    )

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Agent Recommendation"
        verbose_name_plural = "Agent Recommendations"

    def __str__(self):
        return f"Recommendation for Event {self.anomaly_event.id} ({self.status})"

    @property
    def confidence_level(self):
        if self.confidence >= 0.75:
            return "high"
        if self.confidence >= 0.45:
            return "medium"
        return "low"
