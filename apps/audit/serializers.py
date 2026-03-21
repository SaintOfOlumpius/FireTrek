from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id", "user_id", "user_email", "organization_id",
            "method", "path", "status_code", "ip_address",
            "body", "elapsed_ms", "object_type", "object_id", "timestamp",
        ]
        read_only_fields = fields
