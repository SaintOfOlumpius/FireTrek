"""
Incident models.

An Incident is a higher-level event that may aggregate multiple Alerts.
For example, a stolen firearm incident groups together the geofence breach
alert and the subsequent tracking events.

Incidents support a workflow: open → investigating → resolved / escalated.
"""

from django.db import models

from apps.organizations.models import Organization
from core.models import TimestampedModel


class Incident(TimestampedModel):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("investigating", "Investigating"),
        ("resolved", "Resolved"),
        ("escalated", "Escalated"),
        ("closed", "Closed"),
    ]

    PRIORITY_CHOICES = [
        ("critical", "Critical"),
        ("high", "High"),
        ("medium", "Medium"),
        ("low", "Low"),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="incidents"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    firearm = models.ForeignKey(
        "firearms.Firearm",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incidents",
    )
    assigned_to = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_incidents",
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_incidents",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_incidents",
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "incidents"
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "-created_at"]),
        ]


class IncidentAlert(models.Model):
    """Links Alerts to an Incident (many-to-many)."""

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="incident_alerts")
    alert = models.ForeignKey("alerts.Alert", on_delete=models.CASCADE, related_name="incident_alerts")
    linked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "incident_alerts"
        unique_together = [("incident", "alert")]


class IncidentNote(TimestampedModel):
    """Timestamped notes/comments on an incident."""

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey("accounts.User", on_delete=models.CASCADE)
    content = models.TextField()
    attachment = models.FileField(upload_to="incident_notes/", null=True, blank=True)

    class Meta:
        db_table = "incident_notes"
        ordering = ["created_at"]
