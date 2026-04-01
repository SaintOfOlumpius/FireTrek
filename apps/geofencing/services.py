from rest_framework import serializers

from .models import Geofence, GeofenceAssignment, GeofenceEvent

try:
    from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
    GIS_AVAILABLE = True
except Exception:
    GIS_AVAILABLE = False


class GeofenceSerializer(serializers.ModelSerializer):
    area_geojson = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = Geofence
        fields = [
            "id", "organization", "name", "description",
            "area_geojson", "is_active", "color", "created_by", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate_area_geojson(self, value):
        if not GIS_AVAILABLE:
            return value  # skip validation in dev
        import json
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
        if area:
            validated_data["area"] = area
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class GeofenceAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeofenceAssignment
        fields = [
            "id", "geofence", "firearm", "rule", "is_active", "created_by", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class GeofenceEventSerializer(serializers.ModelSerializer):
    firearm_serial = serializers.CharField(
        source="assignment.firearm.serial_number", read_only=True
    )
    geofence_name = serializers.CharField(
        source="assignment.geofence.name", read_only=True
    )

    class Meta:
        model = GeofenceEvent
        fields = [
            "id", "assignment", "location", "direction",
            "timestamp", "alert_generated", "firearm_serial", "geofence_name",
        ]
        read_only_fields = fields