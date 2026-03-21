"""
Celery application factory.

Queue architecture:
- default        — general-purpose tasks
- telemetry      — geofence/alert processing after location ingestion (high volume)
- notifications  — email, SMS, push dispatch (network I/O bound)
- low_priority   — audit logs, analytics, cleanup (can lag without impact)

Keeping queues separate allows independent scaling:
  celery -A workers.celery worker -Q telemetry --concurrency=8
  celery -A workers.celery worker -Q notifications --concurrency=4
  celery -A workers.celery worker -Q low_priority --concurrency=2
"""

import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")

app = Celery("firetrek")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

# ---------------------------------------------------------------------------
# Beat schedule — periodic tasks
# ---------------------------------------------------------------------------

from celery.schedules import crontab  # noqa: E402

app.conf.beat_schedule = {
    "check-offline-devices": {
        "task": "workers.tasks.device_tasks.check_offline_devices",
        "schedule": 60.0,  # every minute
        "options": {"queue": "default"},
    },
    "daily-telemetry-cleanup": {
        "task": "workers.tasks.maintenance_tasks.cleanup_old_telemetry",
        "schedule": crontab(hour=2, minute=0),  # 02:00 UTC daily
        "options": {"queue": "low_priority"},
    },
    "hourly-analytics-aggregation": {
        "task": "workers.tasks.maintenance_tasks.aggregate_hourly_analytics",
        "schedule": crontab(minute=5),  # :05 past every hour
        "options": {"queue": "low_priority"},
    },
    "check-license-expiries": {
        "task": "workers.tasks.alert_tasks.check_license_expiries",
        "schedule": crontab(hour=8, minute=0),  # 08:00 UTC daily
        "options": {"queue": "default"},
    },
}
