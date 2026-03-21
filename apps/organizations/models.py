"""
Multi-tenancy via Organisation model.

Design decisions:
- Each Organisation is a tenant. All domain objects (firearms, devices,
  geofences, alerts) have a FK to Organisation, and every queryset is
  filtered by the requesting user's active memberships.
- Membership stores the role so the same user can have different roles
  across tenants without duplicating the user record.
- slug field gives a stable, human-readable identifier for URL building.
"""

from django.db import models

from apps.accounts.models import User
from core.models import TimestampedModel


class Organization(TimestampedModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=100)
    logo = models.ImageField(upload_to="org_logos/", null=True, blank=True)
    address = models.TextField(blank=True)
    country = models.CharField(max_length=100, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)
    subscription_plan = models.CharField(
        max_length=30,
        choices=[("starter", "Starter"), ("pro", "Pro"), ("enterprise", "Enterprise")],
        default="starter",
    )
    max_devices = models.PositiveIntegerField(default=10)
    max_users = models.PositiveIntegerField(default=5)

    class Meta:
        db_table = "organizations"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Membership(TimestampedModel):
    """Joins a User to an Organisation with a role."""

    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("operator", "Operator"),
        ("viewer", "Viewer"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="viewer")
    is_active = models.BooleanField(default=True)
    invited_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="sent_invitations"
    )
    joined_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "organization_memberships"
        unique_together = [("user", "organization")]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["organization", "role"]),
        ]

    def __str__(self):
        return f"{self.user.email} @ {self.organization.name} ({self.role})"


class Invitation(TimestampedModel):
    """Email invitation to join an organisation."""

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="invitations")
    email = models.EmailField()
    role = models.CharField(max_length=20, choices=Membership.ROLE_CHOICES, default="viewer")
    token = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    expires_at = models.DateTimeField()
    accepted = models.BooleanField(default=False)

    class Meta:
        db_table = "organization_invitations"
