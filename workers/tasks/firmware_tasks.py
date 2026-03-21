"""
OTA firmware deployment tasks.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(queue="default", ignore_result=True)
def queue_ota_tasks(deployment_id: str):
    """
    Creates an OTAUpdateTask for each target device in a FirmwareDeployment.
    The deployment's target_devices are passed in via the deployment object's
    ManyToMany relation, which is populated separately by the API view.
    """
    from apps.firmware.models import FirmwareDeployment, OTAUpdateTask
    from django.utils import timezone

    deployment = FirmwareDeployment.objects.prefetch_related("target_devices").get(pk=deployment_id)

    tasks = [
        OTAUpdateTask(deployment=deployment, device=device, status="queued")
        for device in deployment.target_devices.filter(is_active=True)
    ]
    OTAUpdateTask.objects.bulk_create(tasks, ignore_conflicts=True)

    deployment.status = "in_progress"
    deployment.started_at = timezone.now()
    deployment.save(update_fields=["status", "started_at"])
    logger.info("Queued %d OTA tasks for deployment %s", len(tasks), deployment_id)
