from django.db import models
from apps.organizations.models import Organization
from core.models import TimestampedModel

try:
    from django.contrib.gis.db import models as gis_models
    GIS_AVAILABLE = True
except Exception:
    from django.db import models as gis_models
    GIS_AVAILABLE = False


class Geofence(TimestampedModel):
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="geofences"
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    if GIS_AVAILABLE:
        area = gis_models.MultiPolygonField(geography=True, srid=4326)
    else:
        area = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    color = models.CharField(max_length=7, default="#FF5733")
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True, related_name="created_geofences"
    )

    class Meta:
        db_table = "geofences"
        indexes = [
            models.Index(fields=["organization", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.organization.name})"


class GeofenceAssignment(TimestampedModel):
    RULE_CHOICES = [
        ("stay_inside", "Must Stay Inside"),
        ("stay_outside", "Must Stay Outside"),
    ]
    geofence = models.ForeignKey(Geofence, on_delete=models.CASCADE, related_name="assignments")
    firearm = models.ForeignKey(
        "firearms.Firearm", on_delete=models.CASCADE, related_name="geofence_assignments"
    )
    rule = models.CharField(max_length=20, choices=RULE_CHOICES, default="stay_inside")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User", on_delete=models.SET_NULL, null=True
    )

    class Meta:
        db_table = "geofence_assignments"
        unique_together = [("geofence", "firearm")]
        indexes = [
            models.Index(fields=["firearm", "is_active"]),
        ]


class GeofenceEvent(TimestampedModel):
    DIRECTION_CHOICES = [
        ("enter", "Entered"),
        ("exit", "Exited"),
    ]
    assignment = models.ForeignKey(
        GeofenceAssignment, on_delete=models.CASCADE, related_name="events"
    )
    location = models.ForeignKey(
        "telemetry.Location", on_delete=models.CASCADE, related_name="geofence_events"
    )
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    timestamp = models.DateTimeField()
    alert_generated = models.BooleanField(default=False)

    class Meta:
        db_table = "geofence_events"
        indexes = [
            models.Index(fields=["assignment", "-timestamp"]),
        ]
