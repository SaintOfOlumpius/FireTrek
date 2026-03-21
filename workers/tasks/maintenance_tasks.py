"""
Maintenance / cleanup tasks.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(queue="low_priority", ignore_result=True)
def cleanup_old_telemetry():
    """
    Delete Location records older than TELEMETRY_RETENTION_DAYS.
    Uses chunked deletes to avoid long-running transactions that
    could lock the table during active ingestion.
    """
    from django.utils import timezone
    from datetime import timedelta
    from django.conf import settings

    from apps.telemetry.models import Location

    retention_days = settings.FIRETREK["TELEMETRY_RETENTION_DAYS"]
    cutoff = timezone.now() - timedelta(days=retention_days)
    chunk_size = 10_000
    total_deleted = 0

    while True:
        ids = list(
            Location.objects.filter(timestamp__lt=cutoff)
            .values_list("id", flat=True)[:chunk_size]
        )
        if not ids:
            break
        deleted, _ = Location.objects.filter(id__in=ids).delete()
        total_deleted += deleted
        logger.info("Telemetry cleanup: deleted %d records (total: %d)", deleted, total_deleted)

    logger.info("Telemetry cleanup complete. Total deleted: %d", total_deleted)


@shared_task(queue="low_priority", ignore_result=True)
def aggregate_hourly_analytics():
    """
    Placeholder for hourly analytics aggregation.
    In production this would compute per-device summaries (total distance,
    average speed, time in geofences) and store them in a separate
    analytics table for fast dashboard queries.
    """
    logger.info("Hourly analytics aggregation running...")
    # TODO: implement aggregation into an AnalyticsSummary model
