from rest_framework import serializers

from .models import Device, DeviceHealth


class DeviceSerializer(serializers.ModelSerializer):
    firearm_serial = serializers.CharField(source="firearm.serial_number", read_only=True)

    class Meta:
        model = Device
        fields = [
            "id", "uid", "organization", "firearm", "firearm_serial",
            "name", "status", "is_active",
            "last_seen", "last_battery", "last_latitude", "last_longitude",
            "firmware_version", "notes", "created_at",
        ]
        read_only_fields = [
            "id", "api_key_hash", "last_seen", "last_battery",
            "last_latitude", "last_longitude", "created_at",
        ]


class DeviceProvisionSerializer(serializers.Serializer):
    """Used when creating a new device. Returns the one-time API key."""

    uid = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=100)
    firearm = serializers.UUIDField(required=False, allow_null=True)

    def validate_uid(self, value):
        if Device.objects.filter(uid=value).exists():
            raise serializers.ValidationError("Device UID already exists.")
        return value


class DeviceProvisionResponseSerializer(serializers.ModelSerializer):
    api_key = serializers.CharField()  # One-time raw key

    class Meta:
        model = Device
        fields = ["id", "uid", "name", "organization", "api_key", "created_at"]


class DeviceHealthSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceHealth
        fields = [
            "id", "device", "timestamp", "battery_level",
            "signal_strength", "temperature", "is_charging", "error_code",
        ]
        read_only_fields = ["id"]
