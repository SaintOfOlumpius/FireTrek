import json
from rest_framework import serializers

from .models import Geofence, GeofenceAssignment, GeofenceEvent

try:
    from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
    GIS_AVAILABLE = True
except Exception:
    GIS_AVAILABLE = False


def _serialize_area(obj):
    """Return the stored area as a plain GeoJSON dict, works for both PostGIS and SQLite."""
    if not obj.area:
        return None
    if GIS_AVAILABLE:
        try:
            return json.loads(obj.area.geojson)
        except Exception:
            return None
    # SQLite dev mode — stored as JSON string
    if isinstance(obj.area, str):
        try:
            return json.loads(obj.area)
        except Exception:
            return None
    return obj.area


class GeofenceSerializer(serializers.ModelSerializer):
    """Full serializer — used for create, retrieve, update."""
    area_geojson = serializers.JSONField(write_only=True, required=False)
    area = serializers.SerializerMethodField()
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model = Geofence
        fields = [
            "id", "organization", "name", "description",
            "area_geojson", "area",
            "is_active", "color", "created_by", "created_at", "updated_at",
            "assignment_count",
        ]
        read_only_fields = ["id", "organization", "created_by", "created_at", "updated_at", "area"]

    def get_area(self, obj):
        return _serialize_area(obj)

    def get_assignment_count(self, obj):
        return obj.assignments.filter(is_active=True).count()

    def validate_area_geojson(self, value):
        if not GIS_AVAILABLE:
            if not isinstance(value, dict):
                raise serializers.ValidationError("Must be a GeoJSON object.")
            geom_type = value.get("type")
            if geom_type not in ("Polygon", "MultiPolygon"):
                raise serializers.ValidationError("Must be a Polygon or MultiPolygon.")
            # Basic coordinate sanity check
            coords = value.get("coordinates")
            if not coords:
                raise serializers.ValidationError("Geometry has no coordinates.")
            if geom_type == "Polygon":
                ring = coords[0] if coords else []
                if len(ring) < 4:
                    raise serializers.ValidationError("Polygon must have at least 4 points (ring closed).")
            return value

        try:
            geom = GEOSGeometry(json.dumps(value))
        except Exception:
            raise serializers.ValidationError("Invalid GeoJSON geometry.")

        if geom.geom_type == "Polygon":
            geom = MultiPolygon(geom)
        elif geom.geom_type != "MultiPolygon":
            raise serializers.ValidationError("Geometry must be Polygon or MultiPolygon.")
        return geom

    def create(self, validated_data):
        area = validated_data.pop("area_geojson", None)
        if area is not None:
            if GIS_AVAILABLE:
                validated_data["area"] = area  # already a GEOSGeometry
            else:
                validated_data["area"] = json.dumps(area)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        area = validated_data.pop("area_geojson", None)
        if area is not None:
            if GIS_AVAILABLE:
                validated_data["area"] = area
            else:
                validated_data["area"] = json.dumps(area)
        return super().update(instance, validated_data)


class GeofenceListSerializer(serializers.ModelSerializer):
    """List serializer — includes area so the map can render polygons."""
    area = serializers.SerializerMethodField()
    assignment_count = serializers.SerializerMethodField()

    class Meta:
        model = Geofence
        fields = [
            "id", "name", "description", "color",
            "is_active", "area", "assignment_count", "created_at",
        ]

    def get_area(self, obj):
        return _serialize_area(obj)

    def get_assignment_count(self, obj):
        return obj.assignments.filter(is_active=True).count()


class GeofenceAssignmentSerializer(serializers.ModelSerializer):
    firearm_serial = serializers.CharField(source="firearm.serial_number", read_only=True)
    firearm_display = serializers.SerializerMethodField()
    geofence_name = serializers.CharField(source="geofence.name", read_only=True)

    class Meta:
        model = GeofenceAssignment
        fields = [
            "id", "geofence", "geofence_name",
            "firearm", "firearm_serial", "firearm_display",
            "rule", "is_active", "created_by", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def get_firearm_display(self, obj):
        f = obj.firearm
        if not f:
            return None
        parts = [p for p in [f.serial_number, f.make, f.model] if p]
        return " — ".join(parts[:1]) + (" — " + " ".join(parts[1:]) if len(parts) > 1 else "")

    def validate(self, attrs):
        if attrs.get("geofence") and attrs.get("firearm"):
            if attrs["geofence"].organization_id != attrs["firearm"].organization_id:
                raise serializers.ValidationError(
                    "Firearm and geofence must belong to the same organization."
                )
        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class GeofenceEventSerializer(serializers.ModelSerializer):
    firearm_serial = serializers.CharField(source="assignment.firearm.serial_number", read_only=True)
    firearm_display = serializers.SerializerMethodField()
    geofence_name = serializers.CharField(source="assignment.geofence.name", read_only=True)
    geofence_color = serializers.CharField(source="assignment.geofence.color", read_only=True)
    rule = serializers.CharField(source="assignment.rule", read_only=True)
    latitude = serializers.FloatField(source="location.latitude", read_only=True)
    longitude = serializers.FloatField(source="location.longitude", read_only=True)

    class Meta:
        model = GeofenceEvent
        fields = [
            "id", "assignment", "direction", "timestamp", "alert_generated",
            "firearm_serial", "firearm_display", "geofence_name", "geofence_color",
            "rule", "latitude", "longitude",
        ]
        read_only_fields = fields

    def get_firearm_display(self, obj):
        f = obj.assignment.firearm
        if not f:
            return None
        return f"{f.serial_number} — {f.make} {f.model}".strip()