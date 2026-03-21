from rest_framework import serializers

from .models import Alert


class AlertSerializer(serializers.ModelSerializer):
    device_uid = serializers.CharField(source="device.uid", read_only=True)
    firearm_serial = serializers.CharField(source="firearm.serial_number", read_only=True)
    is_open = serializers.ReadOnlyField()

    class Meta:
        model = Alert
        fields = [
            "id", "organization", "device", "device_uid", "firearm", "firearm_serial",
            "alert_type", "severity", "title", "message", "metadata",
            "dedup_key", "is_open", "resolved_at", "resolved_by",
            "acknowledged_at", "acknowledged_by", "created_at",
        ]
        read_only_fields = [
            "id", "dedup_key", "created_at", "resolved_at",
            "acknowledged_at",
        ]


class AlertAcknowledgeSerializer(serializers.Serializer):
    pass  # No payload needed; user identity comes from request


class AlertResolveSerializer(serializers.Serializer):
    resolution_note = serializers.CharField(required=False, allow_blank=True)
