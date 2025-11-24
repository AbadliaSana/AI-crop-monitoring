from django.db import models
from farms.models import FieldPlot
from sensors.models import SensorReading


class AnomalyEvent(models.Model):
    ANOMALY_TYPES = [
        ("irrigation", "Irrigation issue"),
        ("heat_stress", "Heat stress"),
        ("humidity_issue", "Humidity issue"),
        ("multi_factor", "Multi-factor anomaly"),
    ]

    SEVERITY_LEVELS = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    plot = models.ForeignKey(
        FieldPlot,
        on_delete=models.CASCADE,
        related_name="anomalies",
        help_text="Parcelle concernée par l'anomalie."
    )
    sensor_reading = models.ForeignKey(
        SensorReading,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anomalies",
        help_text="Lecture capteur qui a déclenché l'anomalie (optionnel)."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="Date/heure de détection."
    )
    anomaly_type = models.CharField(
        max_length=50,
        choices=ANOMALY_TYPES,
        help_text="Type d'anomalie détectée."
    )
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_LEVELS,
        help_text="Niveau de sévérité."
    )
    model_confidence = models.FloatField(
        help_text="Confiance du modèle entre 0 et 1."
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="Détails supplémentaires (valeurs, fenêtres temporelles, etc.)."
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["plot", "timestamp"]),
            models.Index(fields=["anomaly_type", "severity"]),
        ]
        verbose_name = "Événement d'anomalie"
        verbose_name_plural = "Événements d'anomalie"

    def __str__(self):
        return f"{self.anomaly_type} ({self.severity}) @ {self.plot}"
