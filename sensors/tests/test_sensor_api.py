# sensors/tests/test_sensor_api.py

from django.utils import timezone
from rest_framework.test import APITestCase
from django.contrib.auth.models import User

from farms.models import FarmProfile, FieldPlot


class SensorAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="secret123")
        self.farm = FarmProfile.objects.create(
            owner=self.user,
            name="API Farm",
            location="Testville",
            size_ha=10.0,
            crop_type="test-crop",
        )
        self.plot = FieldPlot.objects.create(
            farm=self.farm,
            name="API Plot",
            crop_variety="variety",
            area_m2=1000,
        )

    def test_post_sensor_readings_creates_objects(self):
        # Auth JWT
        resp = self.client.post(
            "/api/token/",
            {"username": "tester", "password": "secret123"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        access = resp.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        payload = {
            "plot": self.plot.id,
            "sensor_type": "moisture",
            "value": 63.5,
            "source": "manual",
        }

        resp2 = self.client.post("/api/sensor-readings/", payload, format="json")
        self.assertIn(resp2.status_code, (200, 201))
