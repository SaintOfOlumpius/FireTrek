"""
Alert Engine.

Design:
- All alert creation goes through this service to enforce deduplication.
- The `dedup_key` is a deterministic string that identifies a unique alert
  condition. If an open alert with the same key exists, we update it rather
  than creating a duplicate.
- Deduplication is also protected with a Redis lock to handle concurrent
  telemetry from the same device racing into the alert engine.
- After creating an alert, a Celery task is queued to send notifications.
"""

import hashlib
import logging

from django.utils import timezone

from apps.alerts.models import Alert

logger = logging.getLogger(__name__)


class AlertEngine:

    # ---------------------------------------------------------------------------
    # Factory methods — one per alert type
    # ---------------------------------------------------------------------------

    @classmethod
    def create_geofence_alert(cls, device, assignment, event):
        direction_label = "exited" if event.direction == "exit" else "entered"
        fence_name = assignment.geofence.name
        firearm = device.firearm

        dedup_key = cls._make_key("geofence_breach", device.id, assignment.geofence_id)
        cls._create_or_update(
            device=device,
            alert_type="geofence_breach",
            severity="critical",
            title=f"Geofence Breach: {firearm.serial_number if firearm else device.uid}",
            message=(
                f"Device {device.uid} {direction_label} geofence '{fence_name}' "
                f"at {event.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}."
            ),
            dedup_key=dedup_key,
            metadata={
                "geofence_id": str(assignment.geofence_id),
                "geofence_name": fence_name,
                "direction": event.direction,
                "location_id": str(event.location_id),
            },
        )

    @classmethod
    def create_low_battery_alert(cls, device, battery_level: int):
        from django.conf import settings
        critical = battery_level <= settings.FIRETREK["CRITICAL_BATTERY_THRESHOLD"]
        alert_type = "critical_battery" if critical else "low_battery"
        severity = "critical" if critical else "warning"

        dedup_key = cls._make_key(alert_type, device.id)
        cls._create_or_update(
            device=device,
            alert_type=alert_type,
            severity=severity,
            title=f"{'Critical' if critical else 'Low'} Battery: {device.uid}",
            message=f"Device {device.uid} battery is at {battery_level}%.",
            dedup_key=dedup_key,
            metadata={"battery_level": battery_level},
        )

    @classmethod
    def create_device_offline_alert(cls, device):
        dedup_key = cls._make_key("device_offline", device.id)
        cls._create_or_update(
            device=device,
            alert_type="device_offline",
            severity="warning",
            title=f"Device Offline: {device.uid}",
            message=(
                f"Device {device.uid} has not reported since "
                f"{device.last_seen.strftime('%Y-%m-%d %H:%M UTC') if device.last_seen else 'never'}."
            ),
            dedup_key=dedup_key,
            metadata={"last_seen": device.last_seen.isoformat() if device.last_seen else None},
        )

    @classmethod
    def create_tamper_alert(cls, device):
        dedup_key = cls._make_key("tamper_detected", device.id)
        cls._create_or_update(
            device=device,
            alert_type="tamper_detected",
            severity="critical",
            title=f"Tamper Detected: {device.uid}",
            message=f"Device {device.uid} has reported a tamper event.",
            dedup_key=dedup_key,
            metadata={},
        )

    @classmethod
    def create_sos_alert(cls, device, location):
        dedup_key = cls._make_key("sos_signal", device.id)
        cls._create_or_update(
            device=device,
            alert_type="sos_signal",
            severity="critical",
            title=f"SOS Signal: {device.uid}",
            message=f"Device {device.uid} has sent an SOS signal.",
            dedup_key=dedup_key,
            metadata={
                "latitude": location.latitude,
                "longitude": location.longitude,
                "location_id": str(location.id),
            },
        )

    # ---------------------------------------------------------------------------
    # Internal helpers
    # ---------------------------------------------------------------------------

    @classmethod
    def _create_or_update(cls, device, alert_type, severity, title, message, dedup_key, metadata):
        from django.core.cache import cache

        lock_key = f"alert_lock:{dedup_key}"
        lock = cache.add(lock_key, "1", timeout=10)  # Distributed lock (10 second TTL)
        if not lock:
            logger.debug("Alert dedup lock held for %s — skipping", dedup_key)
            return

        try:
            existing = Alert.objects.filter(
                dedup_key=dedup_key, resolved_at__isnull=True
            ).first()

            if existing:
                logger.debug("Alert already open (dedup_key=%s), skipping", dedup_key)
                return

            alert = Alert.objects.create(
                organization=device.organization,
                device=device,
                firearm=device.firearm,
                alert_type=alert_type,
                severity=severity,
                title=title,
                message=message,
                dedup_key=dedup_key,
                metadata=metadata,
            )
            cls._queue_notifications(alert)
            cls._broadcast_alert(alert)
            logger.info("Alert created: %s [%s]", alert.title, alert.id)

        finally:
            cache.delete(lock_key)

    @classmethod
    def _queue_notifications(cls, alert: Alert):
        from workers.tasks.notification_tasks import dispatch_alert_notifications
        dispatch_alert_notifications.delay(str(alert.id))

    @classmethod
    def _broadcast_alert(cls, alert: Alert):
        from realtime.broadcast import broadcast_alert
        try:
            broadcast_alert(alert)
        except Exception:
            logger.exception("Failed to broadcast alert %s", alert.id)

    @staticmethod
    def _make_key(*parts) -> str:
        raw = ":".join(str(p) for p in parts)
        return hashlib.sha256(raw.encode()).hexdigest()[:32]


class TelemetryAlertEvaluator:
    """
    Evaluates all non-geofence alert conditions from a telemetry reading.
    Called by the Celery task evaluate_telemetry_alerts.
    """

    def __init__(self, location, device):
        self.location = location
        self.device = device
        self.data = {
            "battery": location.battery,
            "sos": False,   # carried in original telemetry payload; stored on location if needed
            "tamper": device.status == "tampered",
        }

    def evaluate(self):
        self._check_battery()
        self._check_tamper()

    def _check_battery(self):
        from django.conf import settings
        battery = self.data["battery"]
        if battery is None:
            return
        threshold = settings.FIRETREK["LOW_BATTERY_THRESHOLD"]
        if battery <= threshold:
            AlertEngine.create_low_battery_alert(self.device, battery)

    def _check_tamper(self):
        if self.data["tamper"]:
            AlertEngine.create_tamper_alert(self.device)
