"""
Telemetry Ingestion Pipeline.

This is the most performance-critical code path in the system. Each call
processes one telemetry packet from an ESP32 device.

Pipeline stages (in order):
1. Build the PostGIS Point geometry from lat/lon.
2. Persist the Location record.
3. Update device denormalised state (last_seen, last_battery, status).
4. Persist a DeviceHealth snapshot.
5. Run geofence checks (PostGIS spatial query).
6. Run alert engine (evaluate conditions, deduplicate, create alerts).
7. Broadcast to WebSocket channel layer.

Each stage is wrapped in a try/except so a failure in step 5 (geofence)
never causes the telemetry to be lost (step 2 already committed).

The geofence and alert stages are offloaded to Celery to keep the
HTTP response under 200 ms even on complex geofence geometries.
"""

import logging
from datetime import timedelta

from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.devices.models import Device, DeviceHealth
from apps.telemetry.models import Location

logger = logging.getLogger(__name__)


class TelemetryIngestionService:
    """
    Entry point for the telemetry pipeline. Called from the API view.

    Design: The service receives the validated serializer data and the
    authenticated device object. It is a plain Python class (not a Model
    method or signal) so that it is easily unit-testable in isolation.
    """

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
        # Keep local object in sync
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
        """
        Fire-and-forget Celery tasks for geofence checks and alert evaluation.
        We pass only PKs to avoid serialising large model instances.
        """
        from workers.tasks.geofence_tasks import check_geofences_for_location
        from workers.tasks.alert_tasks import evaluate_telemetry_alerts

        check_geofences_for_location.delay(str(location.id), str(self.device.id))
        evaluate_telemetry_alerts.delay(str(location.id), str(self.device.id))

        # WebSocket broadcast runs synchronously but is non-blocking because
        # the channel layer send is async-safe via the sync wrapper.
        self._broadcast_location(location)

    def _broadcast_location(self, location: Location):
        from realtime.broadcast import broadcast_location_update
        try:
            broadcast_location_update(self.device, location)
        except Exception:
            logger.exception("WebSocket broadcast failed for device %s", self.device.uid)
