from django.db import models
from core.models import UUIDModel

try:
    from django.contrib.gis.db import models as gis_models
    GIS_AVAILABLE = True
except Exception:
    from django.db import models as gis_models
    GIS_AVAILABLE = False


class Location(UUIDModel):
    device = models.ForeignKey(
        "devices.Device", on_delete=models.CASCADE, related_name="locations"
    )

    if GIS_AVAILABLE:
        point = gis_models.PointField(geography=True, srid=4326)
    else:
        point = models.CharField(max_length=50, null=True, blank=True)

    latitude = models.FloatField()
    longitude = models.FloatField()
    altitude = models.FloatField(null=True, blank=True)
    speed = models.FloatField(null=True, blank=True)
    heading = models.FloatField(null=True, blank=True)
    accuracy = models.FloatField(null=True, blank=True)
    battery = models.SmallIntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(db_index=True)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "telemetry_locations"
        indexes = [
            models.Index(fields=["device", "-timestamp"], name="idx_location_device_time"),
            models.Index(fields=["-timestamp"], name="idx_location_time_desc"),
        ]
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.device.uid} @ {self.timestamp.isoformat()}"
