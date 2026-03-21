"""
Notification models.

A Notification represents a message delivered (or queued for delivery) to
a specific user. We separate the delivery channel (email, SMS, push) from
the notification record so we can track delivery status per-channel.

NotificationPreference stores per-user, per-alert-type settings so users
can choose which events they want to be notified about and via which channel.
"""

from django.db import models

from apps.accounts.models import User
from core.models import TimestampedModel


class Notification(TimestampedModel):
    CHANNEL_CHOICES = [
        ("in_app", "In-App"),
        ("email", "Email"),
        ("sms", "SMS"),
        ("push", "Push"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
        ("read", "Read"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    alert = models.ForeignKey(
        "alerts.Alert",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    title = models.CharField(max_length=255)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "notifications"
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "-created_at"]),
        ]


class NotificationPreference(TimestampedModel):
    """Per-user notification preferences per alert type."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notification_preferences")
    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE
    )
    alert_type = models.CharField(max_length=40)
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = "notification_preferences"
        unique_together = [("user", "organization", "alert_type")]
