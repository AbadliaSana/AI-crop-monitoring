# ml_module/tests/test_pipeline_detection.py

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from django.contrib.auth import get_user_model
from farms.models import FarmProfile, FieldPlot
from sensors.models import SensorReading
from ml_module.pipeline import run_anomaly_detection_for_plot


class PipelineDetectionTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="pipeuser", password="secret123")
        self.farm = FarmProfile.objects.create(
            owner=self.user,
            name="Pipeline Farm",
            location="Testville",
            size_ha=8.5,
            crop_type="demo-crop",
        )
        self.plot = FieldPlot.objects.create(
            farm=self.farm,
            name="Test Plot",
            crop_variety="variety",
            area_m2=900,
        )

    def test_pipeline_creates_anomaly_for_moisture_drop(self):
        now = timezone.now()

        # 30 lectures normales (3 capteurs)
        for i in range(30):
            ts = now - timedelta(minutes=10 * (30 - i))
            SensorReading.objects.create(
                plot=self.plot,
                sensor_type="moisture",
                value=60.0,
                timestamp=ts,
                unit="",
                source="test",
            )
            SensorReading.objects.create(
                plot=self.plot,
                sensor_type="temperature",
                value=25.0,
                timestamp=ts,
                unit="",
                source="test",
            )
            SensorReading.objects.create(
                plot=self.plot,
                sensor_type="humidity",
                value=55.0,
                timestamp=ts,
                unit="",
                source="test",
            )

        # Injection d'une chute de moisture
        SensorReading.objects.create(
            plot=self.plot,
            sensor_type="moisture",
            value=30.0,
            timestamp=now + timedelta(minutes=5),
            unit="",
            source="test",
        )

        event, debug = run_anomaly_detection_for_plot(self.plot)

        self.assertIsNotNone(debug)
        self.assertTrue(debug["threshold"]["is_anomaly"])
        # Avec les seuils resserrés, on attend un event
        self.assertIsNotNone(event)
        self.assertEqual(event.plot, self.plot)
