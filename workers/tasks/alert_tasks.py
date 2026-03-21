"""
Alert-related Celery tasks.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    queue="telemetry",
    max_retries=3,
    default_retry_delay=5,
    acks_late=True,
)
def evaluate_telemetry_alerts(self, location_id: str, device_id: str):
    """Evaluate non-geofence alert conditions for a telemetry reading."""
    try:
        from apps.telemetry.models import Location
        from apps.devices.models import Device
        from apps.alerts.services import TelemetryAlertEvaluator

        location = Location.objects.get(pk=location_id)
        device = Device.objects.select_related("organization", "firearm").get(pk=device_id)

        evaluator = TelemetryAlertEvaluator(location=location, device=device)
        evaluator.evaluate()

    except Exception as exc:
        logger.exception("Alert evaluation failed for location %s", location_id)
        raise self.retry(exc=exc)


@shared_task(queue="default", ignore_result=True)
def check_license_expiries():
    """
    Daily task: create alerts for firearms whose licenses expire within 30 days.
    """
    from datetime import date, timedelta
    from apps.firearms.models import Firearm
    from apps.alerts.models import Alert

    threshold = date.today() + timedelta(days=30)
    expiring = Firearm.objects.filter(
        license_expiry__lte=threshold,
        license_expiry__isnull=False,
        status="active",
    ).select_related("organization")

    for firearm in expiring:
        device = firearm.active_device
        if not device:
            continue

        from apps.alerts.services import AlertEngine
        dedup_key = AlertEngine._make_key("license_expiry", firearm.id)
        Alert.objects.get_or_create(
            dedup_key=dedup_key,
            resolved_at__isnull=True,
            defaults={
                "organization": firearm.organization,
                "device": device,
                "firearm": firearm,
                "alert_type": "license_expiry",
                "severity": "warning",
                "title": f"License Expiry: {firearm.serial_number}",
                "message": (
                    f"Firearm {firearm.serial_number} license expires on "
                    f"{firearm.license_expiry.strftime('%Y-%m-%d')}."
                ),
                "dedup_key": dedup_key,
                "metadata": {"license_expiry": str(firearm.license_expiry)},
            },
        )
