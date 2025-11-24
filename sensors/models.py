from django.db import models
from farms.models import FieldPlot


class SensorReading(models.Model):
    SENSOR_TYPES = [
        ("moisture", "Soil moisture"),
        ("temperature", "Air temperature"),
        ("humidity", "Humidity"),
    ]

    SOURCE_TYPES = [
        ("simulator", "Simulator"),
        ("manual", "Manual entry"),
        ("device", "Physical sensor"),
    ]

    plot = models.ForeignKey(
        FieldPlot,
        on_delete=models.CASCADE,
        related_name="readings",
        help_text="Parcelle à laquelle appartient cette mesure."
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        help_text="Date/heure de la lecture."
    )
    sensor_type = models.CharField(
        max_length=20,
        choices=SENSOR_TYPES,
        help_text="Type de capteur (moisture, temperature, humidity)."
    )
    value = models.FloatField(
        help_text="Valeur numérique mesurée."
    )
    unit = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Unité (%, °C, etc.)."
    )
    source = models.CharField(
        max_length=20,
        choices=SOURCE_TYPES,
        default="simulator",
        help_text="Origine de la donnée."
    )

    class Meta:
        indexes = [
            models.Index(fields=["plot", "timestamp"]),
            models.Index(fields=["sensor_type", "timestamp"]),
        ]
        ordering = ["-timestamp"]
        verbose_name = "Lecture capteur"
        verbose_name_plural = "Lectures capteurs"

    def __str__(self):
        return f"{self.plot} | {self.sensor_type} = {self.value} {self.unit} @ {self.timestamp}"
