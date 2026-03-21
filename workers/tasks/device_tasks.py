"""
Device health Celery tasks.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(queue="default", ignore_result=True)
def check_offline_devices():
    """
    Run every minute. Mark devices offline if they haven't reported within
    the configured threshold (default: 10 minutes) and raise an alert.

    We use a bulk update to avoid N+1 queries across large fleets.
    """
    from django.utils import timezone
    from datetime import timedelta
    from django.conf import settings

    from apps.devices.models import Device
    from apps.alerts.services import AlertEngine

    threshold_minutes = settings.FIRETREK["DEVICE_OFFLINE_THRESHOLD_MINUTES"]
    cutoff = timezone.now() - timedelta(minutes=threshold_minutes)

    # Devices that were online/low_battery but haven't reported recently
    newly_offline = Device.objects.filter(
        is_active=True,
        status__in=["online", "low_battery"],
        last_seen__lt=cutoff,
    ).select_related("organization", "firearm")

    count = 0
    for device in newly_offline:
        Device.objects.filter(pk=device.pk).update(status="offline")
        device.status = "offline"
        AlertEngine.create_device_offline_alert(device)
        count += 1

    if count:
        logger.info("Marked %d device(s) as offline", count)
