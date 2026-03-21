from rest_framework import serializers

from .models import FirmwareVersion, FirmwareDeployment, OTAUpdateTask


class FirmwareVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FirmwareVersion
        fields = [
            "id", "organization", "version", "file", "file_size",
            "checksum_sha256", "changelog", "is_stable", "created_by", "created_at",
        ]
        read_only_fields = ["id", "file_size", "checksum_sha256", "created_by", "created_at"]

    def create(self, validated_data):
        upload = validated_data["file"]
        import hashlib
        sha = hashlib.sha256(upload.read()).hexdigest()
        upload.seek(0)
        validated_data["file_size"] = upload.size
        validated_data["checksum_sha256"] = sha
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class OTAUpdateTaskSerializer(serializers.ModelSerializer):
    device_uid = serializers.CharField(source="device.uid", read_only=True)

    class Meta:
        model = OTAUpdateTask
        fields = [
            "id", "deployment", "device", "device_uid",
            "status", "error_message", "started_at", "completed_at", "retry_count",
        ]
        read_only_fields = fields


class FirmwareDeploymentSerializer(serializers.ModelSerializer):
    tasks = OTAUpdateTaskSerializer(source="otaupdatetask_set", many=True, read_only=True)

    class Meta:
        model = FirmwareDeployment
        fields = [
            "id", "firmware_version", "name", "status",
            "started_at", "completed_at", "created_by", "tasks", "created_at",
        ]
        read_only_fields = ["id", "status", "started_at", "completed_at", "created_by", "created_at"]
