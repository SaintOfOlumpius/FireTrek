"""
Device models for ESP32 GPS trackers.

Design decisions:
- api_key_hash stores the SHA-256 of the raw key so the real key is never
  persisted. The raw key is shown once on provisioning.
- last_seen and last_battery are denormalised onto the Device for fast
  dashboard queries — otherwise you'd always need to join the latest
  Location/DeviceHealth row.
- DeviceHealth is a time-series table recording each telemetry snapshot's
  health metrics separately from location to allow independent analytics.
- FirmwareVersion FK allows the system to know the current firmware on each
  device for OTA update targeting.
"""

import hashlib
import secrets

from django.db import models

from apps.accounts.models import User
from apps.organizations.models import Organization
from core.models import TimestampedModel


class Device(TimestampedModel):
    STATUS_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline"),
        ("low_battery", "Low Battery"),
        ("tampered", "Tampered"),
        ("decommissioned", "Decommissioned"),
    ]

    uid = models.CharField(max_length=50, unique=True)  # e.g. "FT-001"
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="devices"
    )
    firearm = models.ForeignKey(
        "firearms.Firearm",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="devices",
    )
    name = models.CharField(max_length=100)
    api_key_hash = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="offline")
    is_active = models.BooleanField(default=True)

    # Denormalised live state — updated on each telemetry ingestion
    last_seen = models.DateTimeField(null=True, blank=True)
    last_battery = models.SmallIntegerField(null=True, blank=True)
    last_latitude = models.FloatField(null=True, blank=True)
    last_longitude = models.FloatField(null=True, blank=True)

    firmware_version = models.ForeignKey(
        "firmware.FirmwareVersion",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="devices",
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="provisioned_devices"
    )
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "devices"
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["uid"]),
            models.Index(fields=["last_seen"]),
        ]

    def __str__(self):
        return f"{self.uid} ({self.organization.name})"

    @classmethod
    def provision(cls, organization, uid, name, firearm=None, created_by=None):
        """
        Create a device and return (device, raw_api_key).
        The raw key is displayed once and never stored in plaintext.
        """
        raw_key = secrets.token_urlsafe(32)
        hashed = hashlib.sha256(raw_key.encode()).hexdigest()
        device = cls.objects.create(
            organization=organization,
            uid=uid,
            name=name,
            firearm=firearm,
            api_key_hash=hashed,
            created_by=created_by,
        )
        return device, raw_key


class DeviceHealth(TimestampedModel):
    """
    Snapshot of device health metrics captured with each telemetry packet.
    Kept as a separate append-only table to allow trend analysis without
    polluting the Location time-series table.
    """

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="health_records")
    timestamp = models.DateTimeField()
    battery_level = models.SmallIntegerField()
    signal_strength = models.SmallIntegerField(null=True, blank=True)  # RSSI dBm
    temperature = models.FloatField(null=True, blank=True)  # °C
    is_charging = models.BooleanField(default=False)
    error_code = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = "device_health"
        indexes = [
            models.Index(fields=["device", "timestamp"]),
        ]
        ordering = ["-timestamp"]
