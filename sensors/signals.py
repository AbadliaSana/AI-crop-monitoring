# sensors/signals.py
import os
from django.db.models.signals import post_save
from django.dispatch import receiver

from sensors.models import SensorReading
from ml_module.tasks import run_anomaly_detection_for_plot_task

# Tunable batch size via env (default 3 for aggressive testing)
try:
    BATCH_SIZE = int(os.getenv("ANOMALY_BATCH_SIZE", "3"))
except ValueError:
    BATCH_SIZE = 3  # fallback

@receiver(post_save, sender=SensorReading)
def trigger_anomaly_detection(sender, instance, created, **kwargs):
    if not created:
        return

    plot = instance.plot
    count = SensorReading.objects.filter(plot=plot).count()

    if count % BATCH_SIZE == 0:
        run_anomaly_detection_for_plot_task.delay(plot.id)
