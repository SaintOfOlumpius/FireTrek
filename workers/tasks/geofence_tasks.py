"""
Geofence Celery tasks.

check_geofences_for_location is called immediately after every telemetry
ingestion. It runs in the `telemetry` queue which has its own worker pool
so that complex geometry queries never block other queue processing.
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
def check_geofences_for_location(self, location_id: str, device_id: str):
    """
    Run the geofence engine for a single location record.

    acks_late=True ensures the task is not acknowledged until it completes,
    so it will be retried if the worker crashes mid-execution.
    """
    try:
        from apps.telemetry.models import Location
        from apps.devices.models import Device
        from apps.geofencing.services import GeofenceEngine

        location = Location.objects.select_related("device__organization", "device__firearm").get(pk=location_id)
        device = Device.objects.select_related("organization", "firearm").get(pk=device_id)

        engine = GeofenceEngine(location=location, device=device)
        engine.run()

    except Exception as exc:
        logger.exception("Geofence check failed for location %s", location_id)
        raise self.retry(exc=exc)
