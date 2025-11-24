from django.db import models


class AgentRecommendation(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("acknowledged", "Acknowledged"),
        ("resolved", "Resolved"),
    ]

    anomaly_event = models.ForeignKey(
        "anomalies.AnomalyEvent",
        on_delete=models.CASCADE,
        related_name="recommendations",
        help_text="Événement d'anomalie lié à cette recommandation."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="Date/heure de génération de la recommandation."
    )
    recommended_action = models.TextField(
        help_text="Action recommandée pour le fermier."
    )
    explanation_text = models.TextField(
        help_text="Explication lisible par un humain (template de l'agent)."
    )
    confidence = models.FloatField(
        help_text="Confiance de la recommandation (0–1)."
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        help_text="Statut de la recommandation."
    )

    class Meta:
        ordering = ["-timestamp"]
        verbose_name = "Recommandation agent"
        verbose_name_plural = "Recommandations agent"

    def __str__(self):
        return f"Reco for {self.anomaly_event} ({self.status})"
