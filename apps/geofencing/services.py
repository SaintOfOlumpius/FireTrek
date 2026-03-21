"""
Geofence Engine.

Core responsibility: given a Location record, determine which geofences
the device's firearm has entered or exited since the previous reading,
and record a GeofenceEvent for each transition.

PostGIS query:
    SELECT ga.id
    FROM geofence_assignments ga
    JOIN geofences g ON g.id = ga.geofence_id
    WHERE ga.firearm_id = %s
      AND ga.is_active = TRUE
      AND g.is_active = TRUE
      AND ST_Within(ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, g.area)

We use ST_Within against the `area` MultiPolygon, which is indexed by a
PostGIS GiST index for efficient spatial lookup even with thousands of fences.

State tracking:
The last known position relative to each fence is cached in Redis to
determine entry/exit direction. If Redis misses, we query the last
GeofenceEvent for that assignment.
"""

import logging

from django.core.cache import cache
from django.contrib.gis.geos import Point

from apps.geofencing.models import Geofence, GeofenceAssignment, GeofenceEvent
from apps.telemetry.models import Location

logger = logging.getLogger(__name__)

CACHE_TTL = 3600  # 1 hour


class GeofenceEngine:
    def __init__(self, location: Location, device):
        self.location = location
        self.device = device
        self.point = Point(location.longitude, location.latitude, srid=4326)

    def run(self):
        """
        Check all active geofence assignments for this device's firearm
        and emit events for any boundary crossings.
        """
        if not self.device.firearm_id:
            return

        assignments = (
            GeofenceAssignment.objects.filter(
                firearm_id=self.device.firearm_id, is_active=True, geofence__is_active=True
            )
            .select_related("geofence")
        )

        for assignment in assignments:
            self._check_assignment(assignment)

    def _check_assignment(self, assignment: GeofenceAssignment):
        currently_inside = self._is_inside(assignment.geofence)
        previously_inside = self._get_previous_state(assignment)

        if previously_inside is None:
            # No history — just record initial state
            self._set_state(assignment, currently_inside)
            return

        if currently_inside == previously_inside:
            return  # No transition

        direction = "enter" if currently_inside else "exit"
        self._set_state(assignment, currently_inside)
        event = GeofenceEvent.objects.create(
            assignment=assignment,
            location=self.location,
            direction=direction,
            timestamp=self.location.timestamp,
        )
        self._trigger_alert(assignment, event, direction)

    def _is_inside(self, geofence: Geofence) -> bool:
        """Use PostGIS ST_Within via the ORM geography filter."""
        return Geofence.objects.filter(
            pk=geofence.pk, area__covers=self.point
        ).exists()

    def _get_previous_state(self, assignment: GeofenceAssignment):
        cache_key = f"gf_state:{assignment.id}"
        state = cache.get(cache_key)
        if state is None:
            last_event = (
                GeofenceEvent.objects.filter(assignment=assignment)
                .order_by("-timestamp")
                .first()
            )
            if last_event is None:
                return None
            state = last_event.direction == "enter"
            cache.set(cache_key, state, CACHE_TTL)
        return state

    def _set_state(self, assignment: GeofenceAssignment, inside: bool):
        cache.set(f"gf_state:{assignment.id}", inside, CACHE_TTL)

    def _trigger_alert(self, assignment: GeofenceAssignment, event: GeofenceEvent, direction: str):
        from apps.alerts.services import AlertEngine

        rule = assignment.rule
        should_alert = (
            (rule == "stay_inside" and direction == "exit") or
            (rule == "stay_outside" and direction == "enter")
        )
        if should_alert:
            AlertEngine.create_geofence_alert(
                device=self.device,
                assignment=assignment,
                event=event,
            )
            GeofenceEvent.objects.filter(pk=event.pk).update(alert_generated=True)
