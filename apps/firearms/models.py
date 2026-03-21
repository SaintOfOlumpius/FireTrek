"""
Firearm (tracked asset) models.

A Firearm represents a regulated physical item assigned to an Organisation.
Each firearm can have at most one active Device assigned to it at a time.
The assignment history is preserved in DeviceAssignment for audit purposes.
"""

from django.db import models

from apps.accounts.models import User
from apps.organizations.models import Organization
from core.models import TimestampedModel


class FirearmCategory(TimestampedModel):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="firearm_categories")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        db_table = "firearm_categories"
        unique_together = [("organization", "name")]


class Firearm(TimestampedModel):
    """
    Represents a single regulated firearm tracked by FireTrek.
    """

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
        ("lost", "Lost"),
        ("stolen", "Stolen"),
        ("decommissioned", "Decommissioned"),
    ]

    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="firearms"
    )
    category = models.ForeignKey(
        FirearmCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="firearms"
    )
    serial_number = models.CharField(max_length=100)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    calibre = models.CharField(max_length=50, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="active")
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_firearms",
    )
    notes = models.TextField(blank=True)
    image = models.ImageField(upload_to="firearms/", null=True, blank=True)
    license_number = models.CharField(max_length=100, blank=True)
    license_expiry = models.DateField(null=True, blank=True)

    class Meta:
        db_table = "firearms"
        unique_together = [("organization", "serial_number")]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["serial_number"]),
        ]

    def __str__(self):
        return f"{self.make} {self.model} ({self.serial_number})"

    @property
    def active_device(self):
        return self.devices.filter(is_active=True).first()
