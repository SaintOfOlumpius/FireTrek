import logging

from django.utils import timezone

from apps.devices.models import Device, DeviceHealth
from apps.telemetry.models import Location

try:
    from django.contrib.gis.geos import Point
    GIS_AVAILABLE = True
except Exception:
    GIS_AVAILABLE = False

logger = logging.getLogger(__name__)


class TelemetryIngestionService:
    def __init__(self, device: Device, data: dict):
        self.device = device
        self.data = data

    def ingest(self) -> Location:
        location = self._save_location()
        self._update_device_state()
        self._save_health_snapshot()
        self._trigger_async_processing(location)
        return location

    def _save_location(self) -> Location:
        point = None
        if GIS_AVAILABLE:
            point = Point(self.data["longitude"], self.data["latitude"], srid=4326)

        return Location.objects.create(
            device=self.device,
            point=point,
            latitude=self.data["latitude"],
            longitude=self.data["longitude"],
            altitude=self.data.get("altitude"),
            speed=self.data.get("speed"),
            heading=self.data.get("heading"),
            accuracy=self.data.get("accuracy"),
            battery=self.data.get("battery"),
            timestamp=self.data["timestamp"],
        )

    def _update_device_state(self):
        now = timezone.now()
        battery = self.data.get("battery")
        from django.conf import settings
        threshold = settings.FIRETREK["LOW_BATTERY_THRESHOLD"]

        new_status = "online"
        if battery is not None and battery <= threshold:
            new_status = "low_battery"
        if self.data.get("tamper"):
            new_status = "tampered"

        Device.objects.filter(pk=self.device.pk).update(
            last_seen=now,
            last_battery=battery,
            last_latitude=self.data["latitude"],
            last_longitude=self.data["longitude"],
            status=new_status,
        )
        self.device.last_seen = now
        self.device.last_battery = battery
        self.device.status = new_status

    def _save_health_snapshot(self):
        DeviceHealth.objects.create(
            device=self.device,
            timestamp=self.data["timestamp"],
            battery_level=self.data.get("battery", 0),
            signal_strength=self.data.get("signal_strength"),
            temperature=self.data.get("temperature"),
            is_charging=self.data.get("is_charging", False),
            error_code=self.data.get("error_code", ""),
        )

    def _trigger_async_processing(self, location: Location):
        try:
            from workers.tasks.geofence_tasks import check_geofences_for_location
            from workers.tasks.alert_tasks import evaluate_telemetry_alerts

            check_geofences_for_location.delay(str(location.id), str(self.device.id))
            evaluate_telemetry_alerts.delay(str(location.id), str(self.device.id))
        except Exception:
            logger.warning("Celery task dispatch failed — Redis may be unavailable")

        self._broadcast_location(location)

    def _broadcast_location(self, location: Location):
        try:
            from realtime.broadcast import broadcast_location_update
            broadcast_location_update(self.device, location)
        except Exception:
            logger.warning("WebSocket broadcast failed for device %s", self.device.uid)