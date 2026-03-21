from rest_framework import serializers
from django.utils import timezone

from .models import Location


class TelemetryIngestSerializer(serializers.Serializer):
    """
    Validates the payload sent by ESP32 devices.

    The device_uid is authenticated via the DeviceAPIKeyAuthentication
    backend before this serializer runs. We re-verify the UID matches
    the authenticated device to prevent spoofing.
    """

    device_uid = serializers.CharField(max_length=50)
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    altitude = serializers.FloatField(required=False, allow_null=True)
    speed = serializers.FloatField(required=False, allow_null=True, min_value=0)
    heading = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=360)
    accuracy = serializers.FloatField(required=False, allow_null=True, min_value=0)
    battery = serializers.IntegerField(required=False, allow_null=True, min_value=0, max_value=100)
    signal_strength = serializers.IntegerField(required=False, allow_null=True)
    temperature = serializers.FloatField(required=False, allow_null=True)
    is_charging = serializers.BooleanField(required=False, default=False)
    error_code = serializers.CharField(required=False, allow_blank=True, default="")
    sos = serializers.BooleanField(required=False, default=False)
    tamper = serializers.BooleanField(required=False, default=False)
    timestamp = serializers.DateTimeField(default=timezone.now)

    def validate(self, attrs):
        device = self.context.get("device")
        if device and attrs["device_uid"] != device.uid:
            raise serializers.ValidationError(
                {"device_uid": "UID does not match authenticated device."}
            )
        return attrs


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = [
            "id", "device", "latitude", "longitude", "altitude",
            "speed", "heading", "accuracy", "battery", "timestamp", "received_at",
        ]
        read_only_fields = ["id", "received_at"]


class LocationGeoJSONSerializer(serializers.ModelSerializer):
    """GeoJSON-compatible representation for map rendering."""

    type = serializers.SerializerMethodField()
    geometry = serializers.SerializerMethodField()
    properties = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = ["type", "geometry", "properties"]

    def get_type(self, obj):
        return "Feature"

    def get_geometry(self, obj):
        return {"type": "Point", "coordinates": [obj.longitude, obj.latitude]}

    def get_properties(self, obj):
        return {
            "device_uid": obj.device.uid,
            "altitude": obj.altitude,
            "speed": obj.speed,
            "battery": obj.battery,
            "timestamp": obj.timestamp.isoformat(),
        }
