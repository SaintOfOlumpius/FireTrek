"""
Firmware management models.

FirmwareVersion stores each firmware binary with its version string,
changelog, and S3 URL. The OTA update flow:

1. Admin uploads firmware via API → FirmwareVersion created.
2. Admin creates FirmwareDeployment targeting a set of devices.
3. Celery task queues OTAUpdateTask for each target device.
4. On next heartbeat, the device receives an OTA command in the telemetry
   response payload with the signed S3 URL.
5. Device downloads, flashes, reboots, reports new version.
6. OTAUpdateTask status updated to "completed" or "failed".
"""

from django.db import models

from apps.organizations.models import Organization
from core.models import TimestampedModel


class FirmwareVersion(TimestampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="firmware_versions"
    )
    version = models.CharField(max_length=30)
    file = models.FileField(upload_to="firmware/")
    file_size = models.PositiveBigIntegerField()
    checksum_sha256 = models.CharField(max_length=64)
    changelog = models.TextField(blank=True)
    is_stable = models.BooleanField(default=False)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = "firmware_versions"
        unique_together = [("organization", "version")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"v{self.version}"


class FirmwareDeployment(TimestampedModel):
    """Represents a rollout of a firmware version to a set of devices."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    firmware_version = models.ForeignKey(
        FirmwareVersion, on_delete=models.CASCADE, related_name="deployments"
    )
    name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    target_devices = models.ManyToManyField("devices.Device", through="OTAUpdateTask")
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = "firmware_deployments"


class OTAUpdateTask(TimestampedModel):
    """Per-device OTA task within a deployment."""

    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("downloading", "Downloading"),
        ("installing", "Installing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("skipped", "Skipped"),
    ]

    deployment = models.ForeignKey(FirmwareDeployment, on_delete=models.CASCADE)
    device = models.ForeignKey("devices.Device", on_delete=models.CASCADE, related_name="ota_tasks")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued")
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    retry_count = models.SmallIntegerField(default=0)

    class Meta:
        db_table = "firmware_ota_tasks"
        indexes = [
            models.Index(fields=["device", "status"]),
        ]
