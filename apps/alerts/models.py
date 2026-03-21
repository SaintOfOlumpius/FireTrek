"""
Alert models.

Design decisions:
- Alert types are an enumeration on the model rather than a separate table.
  Alert types are domain constants that should be defined in code, not
  configured at runtime by end users.
- `dedup_key` prevents alert storms. When the same condition fires repeatedly
  (e.g. device staying outside geofence), only one open alert is created.
  The dedup key is a deterministic hash of (type, device, geofence/context).
- `resolved_at` NULL means the alert is open. This avoids a separate status
  field and makes "find all open alerts" queries simple.
- Severity levels map to notification urgency: critical → SMS/push,
  warning → push, info → in-app only.
"""

from django.db import models

from apps.organizations.models import Organization
from core.models import TimestampedModel


class Alert(TimestampedModel):
    ALERT_TYPE_CHOICES = [
        ("geofence_breach", "Geofence Breach"),
        ("low_battery", "Low Battery"),
        ("critical_battery", "Critical Battery"),
        ("device_offline", "Device Offline"),
        ("tamper_detected", "Tamper Detected"),
        ("sos_signal", "SOS Signal"),
        ("unauthorized_movement", "Unauthorized Movement"),
        ("license_expiry", "License Expiry"),
    ]

    SEVERITY_CHOICES = [
        ("critical", "Critical"),
        ("warning", "Warning"),
        ("info", "Info"),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="alerts"
    )
    device = models.ForeignKey(
        "devices.Device", on_delete=models.CASCADE, related_name="alerts"
    )
    firearm = models.ForeignKey(
        "firearms.Firearm",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="alerts",
    )
    alert_type = models.CharField(max_length=40, choices=ALERT_TYPE_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    # Deduplication: prevent duplicate open alerts of the same type/device
    dedup_key = models.CharField(max_length=64, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_alerts",
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="acknowledged_alerts",
    )

    class Meta:
        db_table = "alerts"
        indexes = [
            models.Index(fields=["organization", "-created_at"]),
            models.Index(fields=["organization", "resolved_at"]),
            models.Index(fields=["device", "-created_at"]),
            models.Index(fields=["dedup_key", "resolved_at"]),
        ]

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title}"

    @property
    def is_open(self):
        return self.resolved_at is None
