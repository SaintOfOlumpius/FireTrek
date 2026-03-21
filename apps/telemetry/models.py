"""
Location / telemetry models.

This is the highest-volume table in the system. A fleet of 500 devices
reporting every 60 seconds generates ~43 million rows per year.

Indexing strategy:
- (device_id, timestamp DESC) — most common query pattern: "give me the last
  N locations for device X in time range T1–T2".
- BRIN index on timestamp — BRIN (Block Range Index) is orders of magnitude
  smaller than B-tree for monotonically increasing columns like timestamps.
  Useful for analytics queries that scan large time ranges.
- PostGIS GIST index on the `point` geometry column — required for spatial
  containment queries used by the geofence engine (ST_Within, ST_DWithin).

Partitioning (production recommendation):
- Partition by timestamp (monthly) using PostgreSQL declarative partitioning.
  This keeps individual partition sizes manageable and allows cheap partition
  pruning for old-data cleanup. Not shown here as Django doesn't manage
  partition DDL natively; use a migration with RunSQL.
"""

from django.contrib.gis.db import models as gis_models
from django.db import models

from core.models import UUIDModel


class Location(UUIDModel):
    """
    Single GPS telemetry record from an ESP32 device.

    Note: We deliberately do NOT use TimestampedModel here because
    created_at/updated_at are unnecessary overhead for an append-only
    time-series table. The `timestamp` field is the device-reported time.
    """

    device = models.ForeignKey(
        "devices.Device", on_delete=models.CASCADE, related_name="locations"
    )
    # PostGIS PointField stores the geometry as a spatial column.
    # SRID=4326 is WGS84 (standard GPS coordinate system).
    point = gis_models.PointField(geography=True, srid=4326)

    # Scalar telemetry fields duplicated here for query efficiency
    latitude = models.FloatField()
    longitude = models.FloatField()
    altitude = models.FloatField(null=True, blank=True)
    speed = models.FloatField(null=True, blank=True)  # m/s
    heading = models.FloatField(null=True, blank=True)  # degrees
    accuracy = models.FloatField(null=True, blank=True)  # metres
    battery = models.SmallIntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(db_index=True)  # device-reported time
    received_at = models.DateTimeField(auto_now_add=True)  # server ingestion time

    class Meta:
        db_table = "telemetry_locations"
        indexes = [
            models.Index(fields=["device", "-timestamp"], name="idx_location_device_time"),
            models.Index(fields=["-timestamp"], name="idx_location_time_desc"),
            # BRIN index added via migration RunSQL for timestamp column
        ]
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.device.uid} @ {self.timestamp.isoformat()}"
